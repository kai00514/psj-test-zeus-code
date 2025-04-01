import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const secureApiEndpoint = 'https://linkpt.cardservice.co.jp/cgi-bin/secure/api.cgi';
const clientip = '2019002175';
const key = '11da83f6e7ab803020e74be300ad3761d55f7f74';

export default async function handler(req, res) {
  console.log("=== payment-result.js API処理開始 ===");
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const { MD, PaRes } = req.body;
    console.log("受信したパラメータ:");
    console.log("MD:", MD);
    console.log("PaRes:", PaRes);

    // === AuthReq (3Dセキュア認証結果の検証) ============================
    console.log("\n=== AuthReq 送信 ===");
    const authXml = `<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="authentication">
  <authentication>
    <clientip>${clientip}</clientip>
    <key>${key}</key>
  </authentication>
  <xid>${MD}</xid>
  <pares>${PaRes}</pares>
</request>`;
    console.log("AuthReq XML:", authXml);

    const authResponse = await axios.post(secureApiEndpoint, authXml, {
      headers: { 'Content-Type': 'application/xml' },
      responseType: 'text',
    });
    console.log("\n=== AuthRes 受信 ===");
    console.log("AuthRes データ:", authResponse.data);

    const authResult = await parseStringPromise(authResponse.data);
    const authStatus = authResult?.response?.result?.[0]?.status?.[0];
    console.log("認証ステータス:", authStatus);

    // 認証が成功した場合のみPayReqを実行
    if (authStatus === 'success') {
      console.log("\n=== PayReq 送信 ===");
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
      console.log("PayReq XML:", payXml);

      const payResponse = await axios.post(secureApiEndpoint, payXml, {
        headers: { 'Content-Type': 'application/xml' },
        responseType: 'text',
      });
      console.log("\n=== PayRes 受信 ===");
      console.log("PayRes データ:", payResponse.data);

      const payResult = await parseStringPromise(payResponse.data);
      const payStatus = payResult?.response?.result?.[0]?.status?.[0];
      console.log("オーソリステータス:", payStatus);
      console.log("オーソリ結果:", payResult?.response);

      // オーソリ結果をフロントエンドに返す
      const response = {
        status: payStatus === 'success' ? 'success' : 'failure',
        orderNumber: payResult?.response?.order_number?.[0],
        rawPayResponse: payResult?.response
      };
      console.log("\n=== フロントエンドへのレスポンス ===");
      console.log(response);
      res.status(200).json(response);
    } else {
      // 認証失敗の場合
      const response = {
        status: 'failure',
        rawAuthResponse: authResult?.response
      };
      console.log("\n=== 認証失敗レスポンス ===");
      console.log(response);
      res.status(200).json(response);
    }

  } catch (error) {
    console.error('\n=== エラー発生 ===');
    console.error('エラー詳細:', error);
    res.status(500).json({ error: error.message });
  }
  console.log("\n=== payment-result.js API処理終了 ===");
} 