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
    console.log('=== /api/payment (トークン発行 + EnrolReq) 開始 ===');
    console.log('[受信BODY]:', req.body);

    const { cardNumber, expiryYear, expiryMonth, cardHolder, amount } = req.body;
    console.log("information: ", cardNumber, expiryYear, expiryMonth, cardHolder, amount);
    const paddedMonth = expiryMonth.toString().padStart(2, '0'); // ← 2桁ゼロ埋め

    // ----------------------------------
    // (1) トークン発行
    // ----------------------------------
    // expiryYear/expiryMonth をXMLに反映する(例: 2025年08月)
    const tokenXml = `<?xml version="1.0" encoding="utf-8"?>
<request service="token" action="newcard">
  <authentication>
    <clientip>${clientip}</clientip>
  </authentication>
  <card>
    <number>${cardNumber}</number>
    <expires>
      <year>${expiryYear || '2025'}</year>
      <month>${paddedMonth || '08'}</month>
    </expires>
    <name>${cardHolder}</name>
  </card>
</request>`;

    console.log('\n---(1)トークン発行 リクエストXML---\n', tokenXml);

    const tokenResponse = await axios.post(tokenEndpoint, tokenXml, {
      headers: { 'Content-Type': 'text/xml' },
      responseType: 'text', // xmlレスポンスをそのまま受け取る
    });
    console.log('\n---(1)トークン発行 レスポンス生データ---\n', tokenResponse.data);

    const tokenResult = await parseStringPromise(tokenResponse.data);
    const tokenKey = tokenResult?.response?.result?.[0]?.token_key?.[0];

    console.log('(1)取得した tokenKey:', tokenKey);

    if (!tokenKey) {
      console.error('トークンが取得できませんでした:', tokenResult);
      return res.status(500).json({ error: 'Token issuance failed', detail: tokenResult });
    }

    // ----------------------------------
    // (2) EnrolReq (3Dセキュア事前認証)
    // ----------------------------------
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
    <telno validation="strict">09034343282</telno>
    <email language="japanese">onsen0514@gmail.com</email>
  </user>
  <uniq_key>
    <sendid>TEST0001</sendid>
  </uniq_key>
  <use_3ds2_flag>1</use_3ds2_flag>
</request>`;

    console.log('\n---(2)EnrolReq リクエストXML---\n', enrolXml);

    const enrolResponse = await axios.post(secureApiEndpoint, enrolXml, {
      headers: { 'Content-Type': 'application/xml' },
      responseType: 'text',
    });
    console.log('\n---(2)EnrolRes レスポンス生データ---\n', enrolResponse.data);

    const enrolResult = await parseStringPromise(enrolResponse.data);
    const enrolRes = enrolResult?.response || {};
    const xid = enrolRes?.xid?.[0];
    // iframeUrl はエンコードされているケースがあるので decodeURIComponent
    const encodedIframeUrl = enrolRes?.iframeUrl?.[0];
    const iframeUrl = decodeURIComponent(encodedIframeUrl || '');

    console.log('(2)取得した EnrolRes.xid:', xid);
    console.log('(2)取得した EnrolRes.iframeUrl:', iframeUrl);

    // フロント側で setPareqParams() の引数に使うため、一式返す
    res.status(200).json({
      xid,
      iframeUrl,
      // デバッグ用
      rawEnrolResponse: enrolRes,
    });

    console.log('=== /api/payment (トークン発行 + EnrolReq) 完了 ===');
  } catch (err) {
    console.error('エラー発生:', err);
    res.status(500).json({ error: err.message });
  }
}
