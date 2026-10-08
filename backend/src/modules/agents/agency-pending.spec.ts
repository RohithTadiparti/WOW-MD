import { AgencyService, missingAgencyDetails } from './agency.service';

describe('AgencyService.listPending', () => {
  it('lists every unapproved agency, incomplete ones included, and flags what is missing', async () => {
    const complete = {
      id: 'a1',
      agencyName: 'Complete Agency',
      contactPhone: '+917989014590',
      address: 'Road 1',
      startDate: '2022-02-09',
      isApproved: false,
    };
    const bare = {
      id: 'a2',
      agencyName: 'QA Second Agency',
      contactPhone: null,
      address: null,
      startDate: null,
      isApproved: false,
    };
    const agencies = { find: jest.fn().mockResolvedValue([complete, bare]) };
    const service = new AgencyService(
      agencies as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const rows = await service.listPending();

    // Exactly one filter: nothing about the optional details.
    expect(agencies.find).toHaveBeenCalledWith({
      where: { isApproved: false },
      order: { createdAt: 'ASC' },
    });
    expect(rows.map((r) => r.id)).toEqual(['a1', 'a2']);
    expect(rows[0].missingDetails).toEqual([]);
    expect(rows[1].missingDetails).toEqual(['contactPhone', 'address', 'startDate']);
  });

  it('treats a blank string as missing', () => {
    expect(missingAgencyDetails({ contactPhone: '  ', address: 'x', startDate: null })).toEqual([
      'contactPhone',
      'startDate',
    ]);
  });
});
