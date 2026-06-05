const test = async () => {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer re_JRsz916c_HZZDajLobTs6jKucRYF2JxdG`,
      },
      body: JSON.stringify({
        from: 'CertVerify <shak@certsigma.com>',
        to: 'nandagopal.chandragam5@gmail.com',
        subject: 'test',
        html: 'test'
      }),
    });
    console.log("Status:", res.status);
    console.log("Result:", await res.json());
  } catch (e) {
    console.log("Error:", e);
  }
}
test();
