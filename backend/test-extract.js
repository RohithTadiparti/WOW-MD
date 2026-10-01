const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://wow_user:wow_password@localhost:5432/wow_db' });
client.connect().then(async () => {
  const profileRes = await client.query(`SELECT * FROM profiles ORDER BY "createdAt" DESC LIMIT 1`);
  const profile = profileRes.rows[0];
  const detailsRes = await client.query(`SELECT * FROM profile_details WHERE "profileId" = $1`, [profile.id]);
  const details = detailsRes.rows[0];
  console.log("Profile Photos:", profile.photos);
  console.log("Details keys:", Object.keys(details || {}));
  console.log(details);
  client.end();
});
