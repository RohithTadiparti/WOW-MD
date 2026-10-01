import { Inject, Injectable, UnprocessableEntityException, forwardRef } from '@nestjs/common';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { VendorsService } from '../vendors/vendors.service';
import { VendorCategory } from '../../common/enums';
import { AI_PROVIDER, AiProvider } from './ai.provider';

/**
 * WOW Genie, orchestrates existing platform data into recommendations and
 * assistant responses. Match/vendor recos reuse the real engines; budget
 * insights are rule-based; free-form Q&A goes through the pluggable AiProvider.
 */
// One table, shared with the Genie, so the panel and the answer beside it
// cannot disagree about where the money goes.
import { BUDGET_ALLOCATION } from './genie-knowledge';

@Injectable()
export class AiService {
  constructor(
    @Inject(forwardRef(() => MatchmakingService)) private readonly matchmaking: MatchmakingService,
    @Inject(forwardRef(() => VendorsService)) private readonly vendors: VendorsService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  /**
   * The recommended matches panel.
   *
   * Floored at fifty percent deliberately: a recommendation is a claim that
   * this is worth the family's attention, and a list padded out with
   * twelve-percent matches to reach five rows teaches people to ignore it.
   * Fewer rows is the correct answer when there are fewer good matches.
   */
  /**
   * The shortlist, for whoever is being browsed as.
   *
   * `profileId` used to be dropped on the floor here, so an agent looking at a
   * client's Matches page got the *agency account's* recommendations in the
   * right-hand column — profiles of every gender, unrelated to the client
   * whose name was in the selector. That is what "matches are not filtered by
   * gender" turned out to be: not a missing filter, but the wrong subject.
   *
   * The gender rule itself lives in the matchmaking query, where it belongs,
   * and applies as soon as the right profile is asked about.
   */
  /**
   * What the engine puts forward, plus what the family sent over.
   *
   * A profile a relative has deliberately shared is the strongest
   * recommendation on this platform — somebody who knows both sides thought it
   * was worth a look — and it was not appearing here at all. It went to Shared
   * With Me, a screen an individual does not have, so in practice it went
   * nowhere.
   *
   * Family shares are shown first and labelled, because where a suggestion came
   * from changes how it is read: an aunt's suggestion is not a percentage, and
   * presenting it as one would be worse than not showing it.
   */
  async matchRecommendations(actor: AuthUser, profileId?: string) {
    const engine = await this.matchmaking.suggestions(actor, {
      page: 1,
      limit: 5,
      minScore: 50,
      ...(profileId ? { profileId } : {}),
    } as never);

    const shared = await this.matchmaking.familyShared(actor, profileId);
    if (shared.length === 0) return engine;

    // De-duplicated: a profile the engine also liked appears once, as the
    // family suggestion, because that is the more useful of the two framings.
    const sharedIds = new Set(shared.map((row) => row.profile.id));
    return {
      ...engine,
      data: [...shared, ...engine.data.filter((row) => !sharedIds.has(row.profile.id))],
    };
  }

  vendorRecommendations(category?: VendorCategory) {
    return this.vendors.search({ category, page: 1, limit: 5 } as never);
  }

  budgetInsight(totalBudget: number) {
    const breakdown = BUDGET_ALLOCATION.map((a) => ({
      category: a.category,
      percent: a.percent,
      amount: Math.round((totalBudget * a.percent) / 100),
    }));
    return { totalBudget, breakdown };
  }

  async assistant(question: string) {
    const answer = await this.ai.complete(question);
    return { question, answer };
  }

  async extractBiodata(documentUrl: string) {
    const prompt = `You are a biodata extraction assistant. Please extract all the available biodata fields from this image and return them as a JSON object matching this exact structure:
{
  "firstName": "string (required if found)",
  "lastName": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "gender": "string (male, female, other)",
  "heightCm": "number (in cm)",
  "complexion": "string (Fair, Wheatish, Dark)",
  "communicationAddress": "string",
  "alternateMobile": "string",
  "religion": "string",
  "caste": "string",
  "subcaste": "string",
  "motherTongue": "string",
  "maritalStatus": "string (never_married, divorced, widowed, awaiting_divorce)",
  "city": "string",
  "state": "string",
  "country": "string",
  "diet": "string",
  "smoking": "string",
  "drinking": "string",
  "languages": "array of strings",
  "education": { 
    "highestQualification": "string", 
    "college": "string", 
    "occupationStatus": "string (employed, self_employed, not_working)", 
    "profession": "string", 
    "companyName": "string", 
    "annualIncome": "string",
    "workCity": "string",
    "workState": "string",
    "workCountry": "string"
  },
  "family": { 
    "father": { "name": "string", "profession": "string" }, 
    "mother": { "name": "string", "profession": "string" }, 
    "brothers": "number", 
    "sisters": "number" 
  },
  "horoscope": { 
    "timeOfBirth": "string", 
    "cityOfBirth": "string", 
    "stateOfBirth": "string",
    "countryOfBirth": "string",
    "rasi": "string", 
    "star": "string", 
    "padam": "string", 
    "gothram": "string", 
    "kujaDosham": "string",
    "horoscopeMatch": "string"
  },
  "partnerPreferences": { 
    "ageMin": "number", 
    "ageMax": "number", 
    "heightMin": "number", 
    "heightMax": "number", 
    "maritalStatus": "array of strings", 
    "religion": "string", 
    "caste": "array of strings",
    "motherTongue": "array of strings", 
    "education": "array of strings", 
    "occupation": "array of strings", 
    "nri": "string",
    "location": "array of strings",
    "otherInfo": "string"
  }
}
Do not invent values. If a field is not present in the document, omit it or set it to null. Return ONLY raw JSON, without markdown formatting or code blocks.`;
    const responseText = await this.ai.complete(prompt, {
      imageUrl: documentUrl,
      temperature: EXTRACTION_TEMPERATURE,
      json: true,
    });
    const extracted = parseExtraction(responseText);
    // Nothing read is a failure, not an empty success: the app would otherwise
    // announce that the details were filled in and show a blank form.
    if (!extracted) {
      throw new UnprocessableEntityException(
        'We could not read that document. Try a clearer photo of it, or enter the details yourself.',
      );
    }
    return extracted;
  }
}

/** Extraction is transcription: the same document should read the same way twice. */
export const EXTRACTION_TEMPERATURE = 0.1;

/**
 * The fields a model reply actually carries, or null when it carries none.
 *
 * The reply is untrusted text: it may be prose, a fenced block, or JSON whose
 * every value is null. Only an object with at least one real value counts.
 */
export function parseExtraction(text: string): Record<string, unknown> | null {
  const body = text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return hasValue(parsed) ? (parsed as Record<string, unknown>) : null;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === 'object') return Object.values(value as object).some(hasValue);
  return true;
}
