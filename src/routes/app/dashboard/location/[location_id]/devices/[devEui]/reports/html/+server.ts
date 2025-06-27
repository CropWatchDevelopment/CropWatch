import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Create HTML content with Japanese text
		const htmlContent = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Japanese Report</title>
        <style>
          body {
            font-family: 'Noto Sans JP', sans-serif;
            color: #333;
            line-height: 1.6;
            max-width: 595.28px;
            margin: 0;
            padding: 20px;
          }
          h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
            text-align: left;
            padding: 10px;
          }
          td {
            border: 1px solid #ddd;
            padding: 10px;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 0.8em;
            color: #7f8c8d;
          }
        </style>
      </head>
      <body>
        <h1>日本語レポート</h1>
        
        <p>これは日本語のテキストを含むHTMLレポートです。このHTMLはPDFに変換されます。</p>
        
        <h2>データテーブル</h2>
        
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>名前</th>
              <th>部署</th>
              <th>役職</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>田中 太郎</td>
              <td>営業部</td>
              <td>マネージャー</td>
            </tr>
            <tr>
              <td>2</td>
              <td>佐藤 花子</td>
              <td>開発部</td>
              <td>シニアエンジニア</td>
            </tr>
            <tr>
              <td>3</td>
              <td>鈴木 一郎</td>
              <td>マーケティング</td>
              <td>ディレクター</td>
            </tr>
            <tr>
              <td>4</td>
              <td>高橋 美咲</td>
              <td>人事部</td>
              <td>スペシャリスト</td>
            </tr>
            <tr>
              <td>5</td>
              <td>伊藤 健太</td>
              <td>財務部</td>
              <td>アナリスト</td>
            </tr>
          </tbody>
        </table>
        
        <h2>概要</h2>
        
        <p>
          このレポートは、jspdf-html2canvasライブラリを使用してHTMLからPDFを生成する例です。
          日本語のテキストが正しく表示されることを確認するためのテストです。
        </p>
        
        <div class="footer">
          生成日時: ${new Date().toLocaleString('ja-JP')}
        </div>
      </body>
      </html>
    `;

		// Return the HTML content
		return new Response(htmlContent, {
			status: 200,
			headers: {
				'Content-Type': 'text/html; charset=utf-8'
			}
		});
	} catch (error) {
		console.error('Error generating HTML:', error);
		return json({ error: 'Failed to generate HTML' }, { status: 500 });
	}
};
