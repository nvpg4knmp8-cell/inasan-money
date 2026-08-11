export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({ error: "POST only" });

  }

  const key = process.env.AI_GATEWAY_API_KEY;

  if (!key) {

    return res.status(500).json({

      error: "AI_GATEWAY_API_KEY が設定されていません"

    });

  }

  try {

    const { image } = req.body || {};

    if (!image || !image.startsWith("data:image/")) {

      return res.status(400).json({

        error: "画像データがありません"

      });

    }

    const prompt = `

あなたは日本のレシート会計アシスタントです。

目的：

家計簿に登録するため、レシート画像から正確に情報を読み取ってください。

読み取る項目：

- 店舗名

- 日付

- 合計金額

- 商品名

- 商品ごとの金額

- 点数

- カテゴリ

カテゴリは以下から選択してください。

「食費」「日用品」「車」「住居」「光熱費」「趣味」「その他」

重要：

- レシートに書かれている内容を優先してください。

- 商品名が読めない場合は推測せず空文字にしてください。

- 電話番号、登録番号、会員番号、レジ番号などは商品情報として扱わないでください。

- 合計金額は「合計」「total」などの欄を最優先してください。

- 金額は数字で返してください。

- JSON以外の文章は絶対に返さないでください。

必ず次のJSON形式だけで返してください：

{

  "shop": "",

  "date": "YYYY-MM-DD",

  "total": 0,

  "items": [

    {

      "name": "",

      "price": 0,

      "quantity": 1,

      "category": ""

    }

  ]

}

`;

    const response = await fetch(

      "https://ai-gateway.vercel.sh/v1/chat/completions",

      {

        method: "POST",

        headers: {

          "Authorization": `Bearer ${key}`,

          "Content-Type": "application/json"

        },

        body: JSON.stringify({

          model: "openai/gpt-5.4",

          messages: [

            {

              role: "user",

              content: [

                {

                  type: "text",

                  text: prompt

                },

                {

                  type: "image_url",

                  image_url: {

                    url: image

                  }

                }

              ]

            }

          ],

          response_format: {

            type: "json_object"

          },

          temperature: 0

        })

      }

    );

    if (!response.ok) {

      const errorText = await response.text();

      return res.status(response.status).json({

        error: "AI Gateway error",

        detail: errorText

      });

    }

    const data = await response.json();

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {

      return res.status(502).json({

        error: "AIから回答がありませんでした"

      });

    }

    const result = JSON.parse(text);

    return res.status(200).json(result);

  } catch (error) {

    return res.status(500).json({

      error: error?.message || "サーバーエラー"});

}

}
