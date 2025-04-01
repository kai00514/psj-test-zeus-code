// /pages/api/payment-result/callback.js
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const secureApiEndpoint = 'https://linkpt.cardservice.co.jp/cgi-bin/secure/api.cgi';
const clientip = '2019002175';
const key = '11da83f6e7ab803020e74be300ad3761d55f7f74';

export default async function handler(req, res) {
  console.log('=== [CALLBACK] /payment-result/callback 受信 ===');

  if (req.method !== 'POST') {
    console.log('HTTPメソッドがPOST以外のため405を返却');
    return res.status(405).end();
  }

  try {
    console.log('[受信BODY]:', req.body);
    const { MD, PaRes, status } = req.body;

    // (A) status が "success" 以外の場合は即失敗扱い
    if (status !== 'success') {
      console.log('3Dセキュア認証が失敗or中断と判断:', status);
      return res.status(200).json({ status: 'failure' });
    }

    // ----------------------------------
    // (B) AuthReq (3Dセキュア認証結果の検証)
    // ----------------------------------
    console.log('\n=== (B) AuthReq送信 ===');
    const authXml = `<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="authentication">
  <authentication>
    <clientip>${clientip}</clientip>
    <key>${key}</key>
  </authentication>
  <xid>${MD}</xid>
  <pares>${PaRes}</pares>
</request>`;

    console.log('(B) AuthReq XML:', authXml);

    const authResponse = await axios.post(secureApiEndpoint, authXml, {
      headers: { 'Content-Type': 'application/xml' },
      responseType: 'text',
    });
    console.log('(B) AuthRes生データ:', authResponse.data);

    const authResult = await parseStringPromise(authResponse.data);
    const authStatus = authResult?.response?.result?.[0]?.status?.[0] || 'failure';

    console.log('(B) AuthRes status:', authStatus);

    if (authStatus !== 'success') {
      console.log('=> AuthReqが失敗のため処理中断');
      return res.status(200).json({ status: 'failure' });
    }

    // ----------------------------------
    // (C) PayReq (オーソリ処理)
    // ----------------------------------
    console.log('\n=== (C) PayReq送信 ===');
    const payXml = `<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="payment">
  <authentication>
    <clientip>${clientip}</clientip>
    <key>${key}</key>
  </authentication>
  <xid>${MD}</xid>
  <print_am>yes</print_am>
  <print_addition_value>yes</print_addition_value>
</request>`;

    console.log('(C) PayReq XML:', payXml);

    const payResponse = await axios.post(secureApiEndpoint, payXml, {
      headers: { 'Content-Type': 'application/xml' },
      responseType: 'text',
    });
    console.log('(C) PayRes生データ:', payResponse.data);

    const payResult = await parseStringPromise(payResponse.data);
    const payStatus = payResult?.response?.result?.[0]?.status?.[0] || 'failure';

    console.log('(C) PayRes status:', payStatus);

    if (payStatus === 'success') {
      // オーソリ成功
      console.log('=> 決済成功');
      return res.status(200).json({ status: 'success' });
    } else {
      // オーソリ失敗
      console.log('=> 決済失敗');
      return res.status(200).json({ status: 'failure' });
    }

  } catch (error) {
    console.error('=== /payment-result/callback 内で例外発生 ===');
    console.error(error);
    return res.status(500).json({ status: 'failure', error: error.message });
  }
}
