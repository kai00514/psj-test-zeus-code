import axios from 'axios';
import { parseStringPromise, Builder } from 'xml2js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'メソッドが許可されていません' });
  }

  const { xid, paRes } = req.body;
  
  if (!xid) {
    return res.status(400).json({ message: 'xid（MD）が必要です' });
  }

  try {
    console.log('【DEBUG】AuthReq処理開始:', { xid, paRes });
    
    // AuthReqリクエストXMLを構築
    const builder = new Builder();
    const authReqXml = builder.buildObject({
      request: {
        $: {
          service: 'secure_link_3d',
          action: 'authentication'
        },
        xid: xid,
        PaRes: paRes || 'Y'
      }
    });
    
    // Zeus APIにリクエスト送信
    const response = await axios.post(
      'https://linkpt.cardservice.co.jp/cgi-bin/secure/api.cgi',
      authReqXml,
      {
        headers: {
          'Content-Type': 'application/xml'
        }
      }
    );
    
    // XMLレスポンスをJSONに変換
    const result = await parseStringPromise(response.data);
    console.log('【DEBUG】AuthRes結果:', result);
    
    // レスポンス処理
    if (result.response?.result?.[0]?.status?.[0] === 'success') {
      return res.status(200).json({
        status: 'success',
        code: result.response.result[0].code[0],
        message: '認証が成功しました'
      });
    } else {
      return res.status(200).json({
        status: 'failure',
        code: result.response?.result?.[0]?.code?.[0] || 'unknown',
        message: '認証に失敗しました'
      });
    }
  } catch (error) {
    console.error('【ERROR】AuthReq処理エラー:', error);
    return res.status(500).json({ 
      status: 'error',
      message: `認証処理エラー: ${error.message}`
    });
  }
} 