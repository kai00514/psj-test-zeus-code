以下はPayReq/PaRes〜PayReq/PayResまでの仕様です。
この仕様を参考にコードを修正してください。
提供資料の目次
①EMV 3-Dセキュア認証～オーソリまでの導入ガイド
②EnrolReq/EnrolRes
③PaReq/PaRes
④AuthReq/AuthRes
⑤PayReq/PayRes
---
【EMV 3-Dセキュア認証～オーソリまでの導入ガイド】
トークンキーの取得後、EnrolReq/Res、PaReq/Res、AuthReq/Res、PayReq/Resの導入方法となります。
EnrolReq/AuthReq/PayReq リクエスト仕様

EnrolReq/AuthReq/PayReq 共通のリクエスト仕様です。
事業者様のWebシステムよりPOST送信を行ってください。

接続先
POST　https://linkpt.cardservice.co.jp/cgi-bin/secure/api.cgi

リクエスト方法
仕様　　　　　HTTP POSTリクエスト
Content-Type　application/xml もしくは text/xml
Content-Length　XMLデータのサイズ データサイズは最大8192 byteまで
文字コード　UTF-8

※ EnrolReqを受けてからPayReqまでは最長60分データを保持します。60分を超えてAuthReq、PayReqが送信された場合、セッションが存在しない旨のエラーコード（result > code=02100110）が返ります。
処理フロー

【フロント（カード会員ブラウザ）】
カード情報入力画面

↓（画面遷移）

認証画面
認証用フォームを表示する「<div id="3dscontainer"></div>」を配置  
↓  
HTMLに指定のJavaScriptファイルを読み込み  
↓  
EnrolResの戻り値をJavaScript関数「setPareqParams」の引数に指定  
setPareqParamsの引数に「termUrl」を指定  
↓  
PaResにより自動的に「termUrl」で指定したURLへ非同期通信でPOST  
↓  
チャレンジフロー情報や中間メッセージ制御（id="challenge_wait"）を読取  
待機情報を処理するJavaScript関数「loadedChallenge」を実装  
エラー時処理のJavaScript関数「onError」などを実装  
↓  
JavaScript関数「onPaResSuccess」が実行されるので、PayResまでの結果を  
もとに画面遷移などを実装してください。  

決済結果画面
完了や失敗などの結果表示をしてください。

【事業者様サイト（サーバ処理）】
→ EnrolReq
← EnrolRes
→ PaReq
← PaRes
→ AuthReq
← AuthRes
→ PayReq
← PayRes

【ゼウス】
→（EnrolReq 受信）  
←（EnrolRes 応答）  
→（PaReq 受信）  
←（PaRes 応答）  
→（AuthReq 受信）  
←（AuthRes 応答）  
→（PayReq 受信）  
←（PayRes 応答）

【カード会社】
（ゼウスとやりとり）

※ termUrlで指定したURL（プログラム）で認証結果取得。  
AuthReq、PayReq処理を実行し、結果を返してください。
導入手順

1. カード会社の認証用iframeを表示するための枠組みブロックにid属性「3dscontainer」を付与します。
<div id="3dscontainer"></div>

2. 同ページでゼウスのJavaScriptファイルを読み込みます。
<script type="text/javascript" src="https://linkpt.cardservice.co.jp/api/token/2.0/zeus_token_cvv2.js"></script>

JavaScriptは「セキュリティコードのあり/なし」「トークン利用のあり/なし」で読み込むスクリプトが変わります。実装にあわせて読み込むファイルを変更してください。

セキュリティコードあり：
- トークン決済あり：https://linkpt.cardservice.co.jp/api/token/2.0/zeus_token_cvv2.js
- トークン決済なし：https://linkpt.cardservice.co.jp/api/3ds2/3ds-web-wrapper.js

セキュリティコードなし：
- トークン決済あり：https://linkpt.cardservice.co.jp/api/token/2.0/zeus_token2.js
- トークン決済なし：https://linkpt.cardservice.co.jp/api/3ds2/3ds-web-wrapper.js

3. EnrolResから返却された値をJavaScriptの「setPareqParams」関数の引数に指定して実行してください。
// ～各種EnrolResの値を取得する処理
setPareqParams(md, paReq, termUrl, threeDSMethod, iframeUrl);

4. PaRes受信後の画面制御操作メソッド「_onPaResSuccess」を記載してください。
function _onPaResSuccess(data) {
  // 加盟店実装に合わせて、画面の動きを実装してください。
}

5. setPareqParamsのエラー時に実行されるメソッド「_onError」を記載してください。
function _onError(error) {
  // エラーが起きた時の処理を実装してください。
}

返却メッセージサンプル：
- "{"message" : "(status) PaReq 処理エラー"}"：PaReqにて何らかのエラーが発生しました。
- "{"message" : "(status) PaRes 処理エラー"}"：PaResにて何らかのエラーが発生しました。
- "{"message" : "追加認証要求URLがありません。"}"：カード会社からチャレンジURLが返却されませんでした。

（status）にはHTTPのステータスコードが返却されます。想定外のエラーの場合には「0」が返却されます。

6. チャレンジフローの待機時間中に表示するメッセージブロックにid属性「challenge_wait」を付与します。
<div id="challenge_wait">
  <!-- 「しばらくお待ち下さい」のメッセージなど -->
</div>

function loadedChallenge() {
  var div_waiter;
  if ( div_waiter = document.querySelector("div[id='challenge_wait']") ) {
    div_waiter.style.display = 'none';
  }
}
【EnrolReq/EnrolRes】
EMV 3-Dセキュア認証判定仕様
EnrolReq　EnrolRes
初回の決済、もしくは毎回カード情報を登録する場合のEMV 3-Dセキュア認証判定リクエスト仕様となります。
支払方法の指定について
リクエストする「支払方法」の値は以下をご指定ください。
分割はカードブランドにより指定できる値が異なりますので、以下をご利用ください。
支払方法　　　　指定値　　　　　　　　　　　VISA/MASTER/JCB　DINERS　AMEX
一括払い　　　　「01」　　　　　　　　　　　　　　○　　　　　　　　○　　　○
分割払い3回～24回 「03」「05」「06」「10」「12」「15」「18」「20」「24」　○　×　○
リボルビング払い 「99」　　　　　　　　　　　　　　○　　　　　　　　○　　　○
分割払い2回　　　「02」　　　　　　　　　　　　　　○　　　　　　　　○　　　×
ボーナス一括払い 「B1」　　　　　　　　　　　　　　○　　　　　　　　○　　　○
※ 加盟店の契約状況によって利用できる支払い回数は異なります。詳しくはゼウス営業担当までお問い合わせください。

初回/毎回決済
EMV 3-Dセキュア認証判定リクエストXML仕様
初回の決済、もしくは毎回カード情報を登録する場合のEMV 3-Dセキュア認証判定リクエスト仕様となります。

EMV 3-Dセキュア認証判定リクエストXML（初回/毎回決済）
XML要素　　　　XML属性　説明　　　　　　　　　　　　　　属性　　　必須　例
request
　service　　　　ゼウス指定の文字列　　　　　　　　固定値「secure_link_3d」　○　secure_link_3d
　action　　　　 ゼウス指定の文字列　　　　　　　　固定値「enroll」　　　　　○　enroll
authentication
　clientip　　　　ゼウス発行のIPコード　　　　　　　半角数字 5 or 10 byte以下　○　0000000000
　key　　　　　　ゼウス発行の認証キー　　　　　　　半角英数字 40byte　　　　○　1AAABBBCCCDDDEEEFFFGGGHHH
token_key　　　　トークン発行レスポンスで発行されたトークンキー　半角英記号 86byte　○　XXXXXXXXXXXXXXXXXXXXXXXX
payment
　amount　　　　決済金額　与信の場合「0」を指定　半角数字 7byte以下　　　　○　1000
　count　　　　　支払方法（※「支払方法の指定について」参照）　半角英数字 2byte　○　01

EMV 3-Dセキュア認証判定リクエストXML（初回/毎回決済）
request
  user
    telno              ユーザーの電話番号。カードID継続決済で検索キーとして利用しない場合は省略可能。
                       半角数字。○。例: 01234567890
    validation         ユーザーの電話番号の桁数指定。
                       固定値「strict」「permissive」
                       ○。例: strict
    email              決済完了メール送信先のユーザーメールアドレス。
                       半角英数字。○。例: xxxxxx@sbi-finsol.co.jp
    language           決済完了メールで使用する言語。
                       固定値「japanese」「english」
                       ○。例: japanese
  uniq_key
    sendid             カードID継続決済をご利用の場合に必要。
                       半角英数字・半角スペース。※。例: CARD00001
    sendpoint          売上管理画面で確認可能な文字列。
                       半角英数字・半角スペース。任意。例: TEST
  use_3ds2_flag        EMV 3-Dセキュア認証利用フラグ。
                       固定値「1」。○。例: 1
※telno,emailにダミー値（固定値）を利用する場合は営業担当まで要相談。

EMV 3-Dセキュア認証判定リクエストサンプル（初回/毎回決済）
<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="enroll">
  <authentication>
    <clientip>9999999999</clientip>
    <key>1AAABBBCCCDDDEEEFFFGGGHHH</key>
  </authentication>
  <token_key>XXXXXXXXXXXXXXXXXXXXXXXX</token_key>
  <payment>
    <amount>1000</amount>
    <count>01</count>
  </payment>
  <user>
    <telno validation="strict">01234567890</telno>
    <email language="japanese">xxxxxx@sbi-finsol.co.jp</email>
  </user>
  <uniq_key>
    <sendid>1234567890abcdefghij</sendid>
    <sendpoint>1234567890abcdefghij</sendpoint>
  </uniq_key>
  <use_3ds2_flag>1</use_3ds2_flag>
</request>

カードID継続決済  
EMV 3-Dセキュア認証判定リクエストXML仕様  
カード情報を入力せず、お客様環境に保存したsendidを利用する場合のEMV 3-Dセキュア認証判定リクエスト仕様となります。

EMV 3-Dセキュア認証判定リクエストXML（カードID継続決済）

request
  service         ゼウス指定の文字列（固定値「secure_link_3d」） ○ 例: secure_link_3d
  action          ゼウス指定の文字列（固定値「enroll」） ○ 例: enroll
authentication
  clientip        ゼウス発行のIPコード（半角数字 5 or 10 byte以下） ○ 例: 0000000000
  key             ゼウス発行の認証キー（半角英数字 40byte） ○ 例: 1AAABBBCCCDDDEEEFFFGGGHHH
card
  history
    action        ユーザへの決済完了メール送信有無（固定値「send_email」） ○ 例: send_email
    key           カード情報検索条件（固定値「sendid」、または「sendid」と「telno」） ○
                  ※「telno」のみは不可
token_key         トークン発行レスポンスで発行されたトークンキー（半角英数記号 86byte） ○ 例: XXXXXXXXXXXXXX
payment
  amount          決済金額（半角数字 7byte以下） ○ 例: 1000
  count           支払方法（半角英数字 2byte） ○ 例: 01
user
  telno           ユーザーの電話番号（半角数字） ○ 例: 01234567890
  validation      電話番号の桁数指定（固定値「strict」or「permissive」） ○ 例: strict
  email           決済完了メール送信先アドレス（50byte以下） ○ 例: xxxxxx@sbi-finsol.co.jp
  language        使用言語（固定値「japanese」or「english」） ○ 例: japanese
uniq_key
  sendid          カードID（検索キーとして使用）（25byte以下） ○ 例: CARD00001
  sendpoint       フリーパラメータ（50byte以下） 任意 例: TEST
use_3ds2_flag     EMV 3-Dセキュア認証利用フラグ（固定値「1」） ○ 例: 1

EMV 3-Dセキュア認証判定リクエストサンプル（継続決済）
<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="enroll">
  <authentication>
    <clientip>0000000000</clientip>
    <key>1AAABBBCCCDDDEEEFFFGGGHHH</key>
  </authentication>
  <card>
    <history action="send_email">
      <key>telno</key>
      <key>sendid</key>
    </history>
  </card>
  <token_key>XXXXXXXXXXXXXXXXXXXXXXXX</token_key>
  <payment>
    <amount>1000</amount>
    <count>01</count>
  </payment>
  <user>
    <telno validation="strict">01234567890</telno>
    <email language="japanese">xxxxxx@sbi-finsol.co.jp</email>
  </user>
  <uniq_key>
    <sendid>CARD00001</sendid>
    <sendpoint>TEST</sendpoint>
  </uniq_key>
  <use_3ds2_flag>1</use_3ds2_flag>
</request>

EMV 3-Dセキュア認証レスポンス仕様
EMV 3-Dセキュア認証のレスポンス仕様となります。  
認証要求結果と本人認証URLをお返しします。
EMV 3-Dセキュア認証レスポンス仕様
response
  service　　　　ゼウス指定の文字列（固定値「secure_link_3d」）
  action　　　　 ゼウス指定の文字列（固定値「enroll」）
result
  status　　　　 認証結果ステータス
    ・success：認証成功（PaReqへ進む）
    ・outside：EMV 3-Dセキュア非対応ブランド（通常オーソリ処理継続可、ただしチャージバックリスクは加盟店負担）
    ・failure：認証拒否（決済失敗画面を表示）
    ・invalid：入力内容エラー（決済失敗画面を表示）
    ・maintenance：ゼウスメンテナンス時（決済失敗画面を表示）
  code　　　　　エラーコード（コード一覧参照）
xid　　　　　　トランザクションの一意キー（半角英数字 10byte以下）
threeDS2flag　　カードの認証種別（固定値「1」）
iframeUrl　　　インターネットブラウザ情報収集用URL  
　　　　　　　PaReqでフロントに渡す。JavaScriptでデコードして利用。

EMV 3-Dセキュア認証レスポンスサンプル
<?xml version="1.0" encoding="utf-8"?>
<response service="secure_link_3d" action="enroll">
  <result>
    <status>success</status>
    <code>001</code>
  </result>
  <xid>ABCDEFabcdef1234567890</xid>
  <threeDS2flag>1</threeDS2flag>
  <iframeUrl>https://foo/bar/</iframeUrl>
</response>

【PaReq/PaRes】
EMV 3-Dセキュア認証判定処理（EnrolRes）からの後続処理として、リスク判定と認証を行います。
EMV 3-Dセキュア リスク判定〜認証リクエスト仕様

EnrolResから受け取ったパラメータを引数として、JavaScript関数「setPareqParams」を記載してください。
この関数は弊社JavaScriptファイルから実行されます。
// ～各種EnrolResの値を取得する処理
setPareqParams(md, paReq, termUrl, threeDSMethod, iframeUrl);
[パラメータ仕様]
1. 引数: md
   設定値: EnrolResで取得した「response > xid」
2. 引数: paReq
   設定値: 固定値「PaReq」
3. 引数: termUrl
   設定値: 認証結果を返すURL（加盟店で自由に設定）
           TermUrl に加盟店発行のセッションキーを含める事ができます
4. 引数: threeDSMethod
   設定値: 固定値「2」
5. 引数: iframeUrl
   設定値: EnrolResで取得した「response > iframeUrl」
※ 旧提供システムのPaReqに該当する処理のため、フロントへのレスポンスではありますが、
   PaReqという名称を引き継いでおります。
EMV 3-Dセキュア リスク判定～認証レスポンス仕様

PaReqの「termUrl」に指定したURLに対して弊社JavaScriptで非同期通信が行われます。
以下パラメーターが送信されるため、termUrlで指定したプログラムで後続処理を実行してください。

【リクエスト方法】
接続先:termUrl で指定したURL
通信プロトコル:HTTPS
Content-Type:application/json

【パラメーター】
1. パラメーター: MD
   内容: PaReqの取得したパラメーター「md」
2. パラメーター: PaRes
   内容: 認証の結果コード
         「Y」認証成功
         「N」認証拒否
3. パラメーター: status
   内容:
     - 「success」認証成功
         認証成功です。AuthReqへ進めてください。
     - 「failure」認証拒否
         カード会社によって、認証拒否となりましたので、決済失敗画面をご表示ください。
     - 「invalid」入力内容エラー
         入力内容エラーです。処理を終了してください。
     - 「maintenance」エラー発生
         現在メンテナンス中のようです。決済失敗画面をご表示ください。
         処理を終了してください。

【AuthReq/AuthRes】
認証結果取得仕様
PaReqによる認証結果を受け取るにはAuthReqとして送信いただくと、AuthResとしてEMV 3-Dセキュア認証結果をお返しします。
PaResのstatus値が'success'の場合のみ、AuthReqを送信してください。
--------------------------------------------------
認証結果取得リクエストXML（AuthReq）

<XML要素: request>
1. service
   - 属性: ゼウス指定の文字列
   - 必須: ○
   - 固定値: secure_link_3d
2. action
   - 属性: ゼウス指定の文字列
   - 必須: ○
   - 固定値: authentication
3. xid
   - 属性: 本人認証結果（PaRes）のパラメータ「MD」
   - 必須: ○
   - 半角英数字 86byte
4. PaRes
   - 属性: 本人認証結果（PaRes）のパラメータ「PaRes」
   - 必須: ○
   - 固定値: Y（成功）, N（失敗）

【XMLサンプル】
<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="authentication">
  <xid>ABCDEFabcdef1234567890<%64%64%64%64%64%64... </xid>
  <PaRes>Y</PaRes>
</request>
--------------------------------------------------
認証結果取得レスポンスXML（AuthRes）
<XML要素: response>
1. service
   - 属性: ゼウス指定の文字列
   - 固定値: secure_link_3d
2. action
   - 属性: ゼウス指定の文字列
   - 固定値: authentication

<result要素>
3. result
   - 値:
     - success: 認証成功です。PayReqに進んでください
     - failure: カード会社により、認証拒否となりました。決済失敗画面をご表示ください
     - invalid: 入力内容エラーです。決済失敗画面をご表示ください
     - maintenance: ゼウスメンテナンス中です。決済失敗画面をご表示ください
   - 固定値: 上記のいずれか
4. code
   - 内容: エラーコード
   - 半角英数字10byte以下
【XMLサンプル】
<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="authentication">
  <result>
    <status>success</status>
    <code>002</code>
  </result>
</request>

【PayReq/PayRes】
オーソリ処理仕様
オーソリ（与信照会）を行い、決済を実行する仕様です。
--------------------------------------------------
オーソリ処理リクエストXML（PayReq）
<XML要素: request>
1. service
   - 説明: ゼウス指定の文字列
   - 属性: 固定値
   - 必須: ○
   - 値: secure_link_3d
2. action
   - 説明: ゼウス指定の文字列
   - 属性: 固定値
   - 必須: ○
   - 値: payment
3. xid
   - 説明: 本人認証結果（PaRes）の「MD」
   - 属性: 半角英数
   - 必須: ○
   - 例: ABCDEFabcdef1234567890
4. print_am
   - 説明: "yes"で設定するとPayResに以下のパラメータが追加される:
       ・承認番号
       ・伝票番号
       ・加盟店番号
   - 属性: 固定値 "yes"
   - 必須: 任意
5. print_addition_value
   - 説明: "yes"で設定するとPayResに以下のパラメータが追加される:
       ・sendid
       ・sendpoint
       ・仕向け先カード会社コード
       ・支払回数
       ・カードブランド
   - 属性: 固定値 "yes"
   - 必須: 任意

【XMLサンプル】
<?xml version="1.0" encoding="utf-8"?>
<request service="secure_link_3d" action="payment">
  <xid>ABCDEFabcdef1234567890</xid>
  <print_am>yes</print_am>
  <print_addition_value>yes</print_addition_value>
</request>
--------------------------------------------------
オーソリ処理レスポンスXML（PayRes）

<XML要素: response>
1. service
   - 固定値: secure_link_3d
2. action
   - 固定値: payment

<result要素>
3. status
   - 問い合わせ結果
     ・success: 成功
     ・failure: 失敗
     ・invalid: 入力内容エラー
     ・maintenance: ゼウスメンテナンス時
4. code
   - エラーコード（半角英数字10byte以下）
5. order_number
   - オーダーNo（50byte以下）

<card要素>
6. number
   - prefix: カード番号上2桁（2byte）
   - suffix: カード番号下4桁（4byte）
7. expires
   - year: カード有効期限（4byte）
   - month: カード有効期限（2byte）

<am_data要素>
8. syonin: 承認番号（6byte）
9. denpyo: 伝票番号（5byte）
10. merchantno: 加盟店番号（15byte以下）

<addition_value要素>
11. div: 支払回数（2byte）
12. ctype: カードブランド（固定値 V/M/J/A/D/I/P/T）
13. cardsend: 仕向け先コード（11byte以下）
14. sendid: EnrolReqで送信したsendid（25byte以下）
15. sendpoint: EnrolReqで送信したsendpoint（50byte以下）

【XMLサンプル】
<?xml version="1.0" encoding="utf-8"?>
<response service="secure_link_3d" action="payment">
  <result>
    <status>success</status>
    <code>000</code>
  </result>
  <order_number>11.111.11.11-000-222-333</order_number>
  <card>
    <number>
      <prefix>41</prefix>
      <suffix>1111</suffix>
    </number>
    <expires>
      <year>2025</year>
      <month>01</month>
    </expires>
  </card>
  <am_data>
    <syonin>999999</syonin>
    <denpyo>99999</denpyo>
    <merchantno>999999999999999</merchantno>
  </am_data>
  <addition_value>
    <div>01</div>
    <ctype>V</ctype>
    <cardsend>99999999999</cardsend>
    <sendid>CARD00001</sendid>
    <sendpoint>TEST</sendpoint>
  </addition_value>
</response>
