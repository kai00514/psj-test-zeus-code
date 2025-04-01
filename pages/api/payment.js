// /pages/api/payment.js
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const tokenEndpoint = 'https://linkpt.cardservice.co.jp/cgi-bin/token/token.cgi';
const secureApiEndpoint = 'https://linkpt.cardservice.co.jp/cgi-bin/secure/api.cgi';

const clientip = '2019002175';
const key = '11da83f6e7ab803020e74be300ad3761d55f7f74';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end(); // POST以外は許可しない
  }

  try {
    const { cardNumber, expiryYear, expiryMonth, cardHolder, amount } = req.body;

    // === ① トークン発行 ================================================
    const tokenXml = `<?xml version="1.0" encoding="utf-8"?>
<request service="token" action="newcard">
  <authentication>
    <clientip>${clientip}</clientip>
  </authentication>
  <card>
    <number>${cardNumber}</number>
    <expires>
      <year>2025</year>
      <month>08</month>
    </expires>
    <name>${cardHolder}</name>
  </card>
</request>`;
    console.log("tokenXml: ", tokenXml);
    const tokenResponse = await axios.post(tokenEndpoint, tokenXml, {
      headers: { 'Content-Type': 'text/xml' },
      responseType: 'text', // xmlレスポンスをそのまま受け取る
    });
    const tokenResult = await parseStringPromise(tokenResponse.data);
    const tokenKey = tokenResult?.response?.result?.[0]?.token_key?.[0];
    console.log(tokenKey);

    if (!tokenKey) {
      return res.status(500).json({ error: 'Token issuance failed', detail: tokenResult });
    }

    // === ② EnrolReq (3Dセキュアの事前認証) ============================
    const enrolXml = `<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="enroll">
  <authentication>
    <clientip>${clientip}</clientip>
    <key>${key}</key>
  </authentication>
  <token_key>${tokenKey}</token_key>
  <payment>
    <amount>${amount || 1000}</amount>
    <count>01</count>
  </payment>
  <user>
    <telno validation="strict">01234567890</telno>
    <email language="japanese">test@test.com</email>
  </user>
  <uniq_key>
    <sendid>TEST0001</sendid>
  </uniq_key>
  <use_3ds2_flag>1</use_3ds2_flag>
</request>`;

    const enrolResponse = await axios.post(secureApiEndpoint, enrolXml, {
      headers: { 'Content-Type': 'application/xml' },
      responseType: 'text',
    });
    const enrolResult = await parseStringPromise(enrolResponse.data);
    console.log("-------------- enrolReq --------------");
    const enrolRes = enrolResult?.response;
    console.log("overall: ", enrolRes);
    console.log("status-code: ", enrolRes.result[0].status[0]);
    const xid = enrolRes?.xid?.[0];
    const encodedIframeUrl = enrolRes?.iframeUrl?.[0];
    // iframeUrlをデコード
    const iframeUrl = decodeURIComponent(encodedIframeUrl);
    // 3Dセキュア完了後に呼び出される TermURL
    const termUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/payment-result`;

    // ここでは、xid や iframeUrl をフロントへ返す
    res.status(200).json({
      tokenKey,
      xid,
      iframeUrl,
      termUrl,
      rawEnrolResponse: enrolRes, // デバッグ用にまるごと返してもOK
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
