import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const secureApiEndpoint = 'https://linkpt.cardservice.co.jp/cgi-bin/secure/api.cgi';
const clientip = '2019002175';
const key = '11da83f6e7ab803020e74be300ad3761d55f7f74';

// AuthReq XML生成 - 仕様書通り
const generateAuthXml = (MD, PaRes) => {
  console.log('=== generateAuthXml 関数呼び出し ===');
  console.log('MD 値:', MD);
  console.log('PaRes 値:', PaRes);
  
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="authentication">
  <authentication>
    <clientip>${clientip}</clientip>
    <key>${key}</key>
  </authentication>
  <xid>${MD}</xid>
  <pares>${PaRes}</pares>
</request>`;

  return xml;
};

// PayReq XML生成 - 仕様書通り
const generatePayXml = (MD) => {
  console.log('=== generatePayXml 関数呼び出し ===');
  console.log('MD 値:', MD);
  
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="payment">
  <authentication>
    <clientip>${clientip}</clientip>
    <key>${key}</key>
  </authentication>
  <xid>${MD}</xid>
  <print_am>yes</print_am>
  <print_addition_value>yes</print_addition_value>
</request>`;

  return xml;
};

// API通信用の関数
const sendSecureRequest = async (xml) => {
  console.log('=== sendSecureRequest 関数呼び出し ===');
  console.log('リクエストXML:', xml);
  
  try {
    const response = await axios.post(secureApiEndpoint, xml, {
      headers: { 'Content-Type': 'application/xml' },
      responseType: 'text',
    });
    
    console.log('APIレスポンス受信:', response.status);
    console.log('APIレスポンス本文:', response.data);
    
    const parsedData = await parseStringPromise(response.data);
    return parsedData;
  } catch (error) {
    console.error('APIリクエストエラー:', error.message);
    if (error.response) {
      console.error('エラーレスポンス:', error.response.data);
    }
    throw error;
  }
};

// 認証処理 - AuthReq/AuthRes
const processAuthentication = async (MD, PaRes) => {
  console.log("\n=== AuthReq 送信 ===");
  
  const authXml = generateAuthXml(MD, PaRes);
  console.log("AuthReq XML:", authXml);

  try {
    const authResult = await sendSecureRequest(authXml);
    console.log("\n=== AuthRes 受信 ===");
    
    const status = authResult?.response?.result?.[0]?.status?.[0];
    const code = authResult?.response?.result?.[0]?.code?.[0];
    const message = authResult?.response?.result?.[0]?.message?.[0];
    
    console.log("認証ステータス詳細:", { status, code, message });
    
    return {
      status,
      code,
      message
    };
  } catch (error) {
    console.error("認証処理エラー:", error);
    return {
      status: 'failure',
      code: 'E99',
      message: error.message
    };
  }
};

// 決済処理 - PayReq/PayRes
const processPayment = async (MD) => {
  console.log("\n=== PayReq 送信 ===");
  const payXml = generatePayXml(MD);
  console.log("PayReq XML:", payXml);

  try {
    const payResult = await sendSecureRequest(payXml);
    console.log("\n=== PayRes 受信 ===");
    
    // 仕様書通りのレスポンス解析
    const status = payResult?.response?.result?.[0]?.status?.[0];
    const code = payResult?.response?.result?.[0]?.code?.[0];
    const message = payResult?.response?.result?.[0]?.message?.[0];
    const orderNumber = payResult?.response?.order_number?.[0];
    
    // カード情報の取得
    const cardPrefix = payResult?.response?.card?.[0]?.number?.[0]?.prefix?.[0];
    const cardSuffix = payResult?.response?.card?.[0]?.number?.[0]?.suffix?.[0];
    const expiryYear = payResult?.response?.card?.[0]?.expires?.[0]?.year?.[0];
    const expiryMonth = payResult?.response?.card?.[0]?.expires?.[0]?.month?.[0];
    
    // 決済詳細情報の取得
    const authNumber = payResult?.response?.am_data?.[0]?.syonin?.[0];
    const slipNumber = payResult?.response?.am_data?.[0]?.denpyo?.[0];
    const merchantNumber = payResult?.response?.am_data?.[0]?.merchantno?.[0];
    
    // 追加情報の取得
    const paymentCount = payResult?.response?.addition_value?.[0]?.div?.[0];
    const cardType = payResult?.response?.addition_value?.[0]?.ctype?.[0];
    const cardCompanyCode = payResult?.response?.addition_value?.[0]?.cardsend?.[0];
    const sendId = payResult?.response?.addition_value?.[0]?.sendid?.[0];
    const sendPoint = payResult?.response?.addition_value?.[0]?.sendpoint?.[0];
    
    return {
      status,
      code,
      message,
      orderNumber,
      cardInfo: {
        prefix: cardPrefix,
        suffix: cardSuffix,
        expiryYear,
        expiryMonth
      },
      paymentDetails: {
        authNumber,
        slipNumber,
        merchantNumber,
        paymentCount,
        cardType,
        cardCompanyCode,
        sendId,
        sendPoint
      },
      rawResponse: payResult?.response
    };
  } catch (error) {
    console.error("決済処理エラー:", error);
    return {
      status: 'failure',
      code: 'E99',
      message: error.message,
      orderNumber: null,
      cardInfo: null,
      paymentDetails: null,
      rawResponse: null
    };
  }
};

export default async function handler(req, res) {
  console.log("=== payment-result.js API処理開始 ===");
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log("受信データ:", JSON.stringify(req.body, null, 2));
    const { MD, PaRes, status } = req.body;

    if (!MD) {
      console.error("MDパラメータ不足");
      return res.status(400).json({
        status: 'failure',
        message: 'MDパラメータが不足しています'
      });
    }

    // PaResの状態に基づく処理
    if (status && status !== 'success') {
      console.log("認証拒否のため処理中断");
      return res.status(200).json({
        status: 'failure',
        message: '認証が拒否されました',
        authStatus: status
      });
    }

    // 認証処理 (AuthReq/AuthRes)
    console.log("認証処理開始 (AuthReq/AuthRes)");
    const authResult = await processAuthentication(MD, PaRes);
    console.log("認証処理結果:", authResult);
    
    if (authResult.status !== 'success') {
      console.error("認証失敗:", authResult);
      return res.status(200).json({
        status: 'failure',
        message: '認証に失敗しました',
        authCode: authResult.code,
        authMessage: authResult.message
      });
    }

    // 決済処理 (PayReq/PayRes) - 認証成功の場合のみ実行
    console.log("決済処理開始 (PayReq/PayRes)");
    const paymentResult = await processPayment(MD);
    console.log("決済処理結果:", paymentResult);
    
    const response = {
      status: paymentResult.status === 'success' ? 'success' : 'failure',
      code: paymentResult.code,
      message: paymentResult.message,
      orderNumber: paymentResult.orderNumber,
      cardInfo: paymentResult.cardInfo,
      paymentDetails: paymentResult.paymentDetails,
      rawPayResponse: paymentResult.rawResponse
    };

    console.log("\n=== フロントエンドへのレスポンス ===");
    console.log(JSON.stringify(response, null, 2));
    res.status(200).json(response);

  } catch (error) {
    console.error('決済完了処理エラー:', error);
    res.status(500).json({
      status: 'failure',
      message: '決済処理中にエラーが発生しました',
      error: error.message
    });
  }
  console.log("\n=== payment-result.js API処理終了 ===");
} 