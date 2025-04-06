// /pages/api/payment.js
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const tokenEndpoint = 'https://linkpt.cardservice.co.jp/cgi-bin/token/token.cgi';
const secureApiEndpoint = 'https://linkpt.cardservice.co.jp/cgi-bin/secure/api.cgi';

const clientip = '2019002175';
const key = '11da83f6e7ab803020e74be300ad3761d55f7f74';

// トークン発行用のXML生成
const generateTokenXml = (cardNumber, expiryYear, expiryMonth, cardHolder) => {
  const paddedMonth = expiryMonth.toString().padStart(2, '0');
  return `<?xml version="1.0" encoding="utf-8"?>
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
};

// EnrolReq用のXML生成
const generateEnrolXml = (tokenKey, amount) => `<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="enroll">
  <authentication>
    <clientip>${clientip}</clientip>
    <key>${key}</key>
  </authentication>
  <token_key>${tokenKey}</token_key>
  <payment>
    <amount>${amount || 300}</amount>
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

// トークン発行処理
const issueToken = async (cardNumber, expiryYear, expiryMonth, cardHolder) => {
  console.log('\n=== トークン発行処理開始 ===');
  const tokenXml = generateTokenXml(cardNumber, expiryYear, expiryMonth, cardHolder);
  console.log('トークン発行リクエストXML:', tokenXml);

  const tokenResponse = await axios.post(tokenEndpoint, tokenXml, {
    headers: { 'Content-Type': 'text/xml' },
    responseType: 'text',
  });
  console.log('トークン発行レスポンス:', tokenResponse.data);

  const tokenResult = await parseStringPromise(tokenResponse.data);
  const tokenKey = tokenResult?.response?.result?.[0]?.token_key?.[0];

  if (!tokenKey) {
    throw new Error('トークンの取得に失敗しました');
  }

  return tokenKey;
};

// EnrolReq処理
const processEnrol = async (tokenKey, amount) => {
  console.log('\n=== EnrolReq処理開始 ===');
  const enrolXml = generateEnrolXml(tokenKey, amount);
  console.log('EnrolReqリクエストXML:', enrolXml);

  const enrolResponse = await axios.post(secureApiEndpoint, enrolXml, {
    headers: { 'Content-Type': 'application/xml' },
    responseType: 'text',
  });
  console.log('EnrolResレスポンス:', enrolResponse.data);

  const enrolResult = await parseStringPromise(enrolResponse.data);
  const enrolRes = enrolResult?.response || {};
  
  return {
    xid: enrolRes?.xid?.[0],
    iframeUrl: decodeURIComponent(enrolRes?.iframeUrl?.[0] || ''),
    rawEnrolResponse: enrolRes
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    console.log('=== /api/payment 処理開始 ===');
    console.log('受信データ:', req.body);

    const { cardNumber, expiryYear, expiryMonth, cardHolder, amount } = req.body;

    // トークン発行
    const tokenKey = await issueToken(cardNumber, expiryYear, expiryMonth, cardHolder);
    console.log('取得したトークン:', tokenKey);

    // EnrolReq処理
    const enrolResult = await processEnrol(tokenKey, amount);
    console.log('EnrolReq結果:', enrolResult);

    res.status(200).json(enrolResult);
    console.log("enrolResult status: ", enrolResult.rawEnrolResponse.result[0].status);
    console.log("enrolResult code: ", enrolResult.rawEnrolResponse.result[0].code);
    console.log('=== /api/payment 処理完了 ===');

  } catch (error) {
    console.error('処理エラー:', error);
    res.status(500).json({ error: error.message });
  }
}
