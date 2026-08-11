export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({error:"POST only"});
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) return res.status(500).json({error:"AI_GATEWAY_API_KEY がVercelに設定されていません"});
  try {
    const {image} = req.body || {};
    if (!image || !image.startsWith("data:image/")) return res.status(400).json({error:"レシート画像がありません"});
    const prompt = `あなたは日本のレシート会計アシスタントです。画像を見て、レシートの構造を理解し、JSONだけを返してください。
目的：家計簿に登録するため、店舗、日付、合計、点数、各商品の商品名・税込価格・カテゴリを抽出します。
カテゴリは「食費」「日用品」「車」「住居」「光熱費」「趣味」「医療」「その他」のいずれか。
商品名が読めない場合は推測で作らず空文字にしてください。価格も不明なら0。
電話番号、登録番号、会員番号、レジ番号などを商品価格と絶対に混同しないでください。
合計はレシートの「合計」「total」等の欄を最優先。商品価格の合計と合わない場合も、合計欄の数字を採用してください。
JSON形式：
{"shop":"","date":"YYYY-MM-DD","total":0,"count":0,"items":[{"name":"","price":0,"category":""}]}
JSON以外は返さないでください。`;
    const r = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method:"POST",
      headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"openai/gpt-5.5",
        messages:[{role:"user",content:[
          {type:"text",text:prompt},
          {type:"image_url",image_url:{url:image,detail:"auto"}}
        ]}],
        response_format:{type:"json_object"},
        temperature:0
      })
    });
    if(!r.ok){const t=await r.text();return res.status(502).json({error:"AI Gateway error: "+t.slice(0,300)})}
    const j=await r.json(), text=j.choices?.[0]?.message?.content;
    if(!text) return res.status(502).json({error:"AIから結果が返りませんでした"});
    const parsed=JSON.parse(text);
    return res.status(200).json(parsed);
  } catch(e) {
    return res.status(500).json({error:e.message||"解析エラー"});
  }
}
