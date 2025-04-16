import axios from 'axios';
import { parseStringPromise, Builder } from 'xml2js';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'メソッドが許可されていません' });
  }

  try {
    console.log('=== 決済リクエスト受信 [START] ===');
    console.log('リクエストボディ:', req.body);
    
    // MDとPaResを取得
    const md = req.body.MD;
    const paRes = req.body.PaRes;
    
    if (!md) {
      return res.status(400).json({ message: 'MD（トランザクションID）が必要です' });
    }
    
    // 通常はここでZeus APIを呼び出して決済を完了させる
    // このサンプルでは成功レスポンスを返す
    const orderNumber = 'ORD-' + Date.now().toString().substring(6);
    
    // 成功レスポンスを返す
    return res.status(200).json({
      status: 'success',
      orderNumber: orderNumber,
      amount: req.body.amount || '1000',
      timestamp: new Date().toISOString(),
      cardInfo: {
        prefix: '4111',
        suffix: '1111',
        expires: {
          month: '08',
          year: '29'
        }
      },
      amData: {
        syonin: 'ZEUS' + Math.floor(Math.random() * 100000)
      }
    });
  } catch (error) {
    console.error('決済処理エラー:', error);
    return res.status(500).json({ message: error.message });
  }
} 