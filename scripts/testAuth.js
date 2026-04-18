(async () => {
  try {
    const API_KEY = "AIzaSyDaN37qj7QBWN3Ro98KOrhPk5i8rKVnWx8";
    const email = `test+${Date.now()}@example.com`;
    const password = 'Test123!';
    console.log('Creating user:', email);

    let res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const data = await res.json();
    console.log('signUp response:', data);
    if (!data.idToken) {
      console.error('Failed to create user. Exiting.');
      process.exit(1);
    }

    const idToken = data.idToken;

    console.log('Sending verification email...');
    res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken })
    });
    const sendResp = await res.json();
    console.log('sendOobCode response:', sendResp);

    console.log('Looking up user...');
    res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const lookup = await res.json();
    console.log('accounts:lookup response:', lookup);

    console.log('\nSummary:');
    console.log('- Created user:', email);
    console.log('- idToken present:', !!idToken);
    console.log('- Verification email request id:', sendResp.email || sendResp.oobCode || JSON.stringify(sendResp));
    console.log('- Email verified (should be false):', lookup.users && lookup.users[0] ? lookup.users[0].emailVerified : 'unknown');

  } catch (e) {
    console.error('Error during test script:', e);
    process.exit(1);
  }
})();
