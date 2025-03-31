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
      // ① APIへカード情報を送信し、トークン発行＆EnrolReq
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cardNumber,
          expiryMonth,
          expiryYear,
          cardHolder,
          amount
        })
      });

      if (!response.ok) {
        throw new Error('API Error');
      }

      const data = await response.json();
      console.log('Payment API Response:', data);

      // data.iframeUrl があれば 3Dセキュア用のiframeを表示
      if (data.iframeUrl) {
        setIframeUrl(data.iframeUrl);
      }

      // ※ ここから先 (PaReq/PaRes → AuthReq/AuthRes → PayReq/PayRes) は
      //    3Dセキュアのフローに合わせて実装が必要。
      //    いったん "3Dセキュアの画面に遷移" or "iframeを表示" のどちらかのパターンが多いです。
      //    TermURLに制御が返る/コールバックが来る などの実装を続けていきます。

    } catch (err) {
      console.error(err);
      alert('決済リクエストに失敗しました');
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

      {/* 3Dセキュア用のiframeを表示（enroll結果にiframeUrlがある場合） */}
      {iframeUrl && (
        <div style={{ marginTop: '2rem' }}>
          <h3>3Dセキュア認証</h3>
          <iframe
            src={iframeUrl}
            title="3D Secure"
            width="100%"
            height="400px"
          />
        </div>
      )}
    </div>
  );
}
