// /pages/credit-card.js
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function CreditCard() {
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [amount, setAmount] = useState(1000);

  // 3Dセキュア用の情報を受け取るためのstate（画面内にiframeを埋め込みたい場合など）
  const [iframeUrl, setIframeUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardNumber,
          expiryYear,
          expiryMonth,
          cardHolder,
          amount,
        }),
      });
      console.log("/api/payment route - response: ", response);

      const data = await response.json();
      if (data.iframeUrl) {
        // URLから不要なベースURLを削除
        console.log("iframURLから不要部分を削除する前のURL: ", data.iframeUrl);
        const cleanUrl = data.iframeUrl.replace(/^.*?\/https/, 'https');
        const decodedUrl = decodeURIComponent(cleanUrl);
        console.log("iframeURL decodeUrl: ", decodeUrl);
        
        // 新しいウィンドウで3Dセキュア認証ページを開く
        const secureWindow = window.open(
          decodedUrl,
          '3DSecure',
          'width=800,height=600,location=yes,status=yes,scrollbars=yes'
        );

        // ポップアップブロックの確認
        if (!secureWindow || secureWindow.closed || typeof secureWindow.closed == 'undefined') {
          alert('ポップアップがブロックされました。ブラウザの設定を確認してください。');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('決済処理中にエラーが発生しました。');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '1rem' }}>
      <h2>クレジットカード情報入力</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>カード番号</label><br />
          <input
            type="text"
            maxLength={16}
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>有効期限</label><br />
          <select
            value={expiryMonth}
            onChange={(e) => setExpiryMonth(e.target.value)}
            style={{ marginRight: '0.5rem' }}
          >
            <option value="">月</option>
            {[...Array(12)].map((_, i) => {
              const m = i + 1;
              return <option key={m} value={m}>{m}</option>;
            })}
          </select>
          <select
            value={expiryYear}
            onChange={(e) => setExpiryYear(e.target.value)}
          >
            <option value="">年</option>
            {[...Array(10)].map((_, i) => {
              const year = new Date().getFullYear() + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>カード名義</label><br />
          <input
            type="text"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>決済金額</label><br />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <button type="submit" style={{ padding: '0.5rem 1rem' }}>
          決済
        </button>
      </form>
    </div>
  );
}
