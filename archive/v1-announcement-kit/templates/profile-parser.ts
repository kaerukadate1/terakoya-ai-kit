export function parseSheet(text: string, kind: "announcement" | "business") {
  if(kind === "business" && text.includes("【事業名】")) {
    const map:Record<string,string>={"事業名":"businessName","事業・サービス内容":"serviceDescription","名前・呼び名":"nickname","強み":"strengths","料金・提供形式":"pricing","活動範囲":"area","リンク":"links","希望する文体":"tone","希望文体":"tone","避けたい表現":"avoid"};
    const values:Record<string,string>={};
    for(const m of text.matchAll(/【([^】]+)】\s*\n([\s\S]*?)(?=\n【|$)/g)){const k=map[m[1]];if(k)values[k]=m[2].trim();}
    return {values,recognized:Boolean(values.businessName)};
  }
  if (kind === "business" && /^[\uFEFF \t]*事業名[：:]/m.test(text)) {
    const map:Record<string,string>={"事業名":"businessName","事業・サービス内容":"serviceDescription","名前・呼び名":"nickname","強み":"strengths","料金・提供形式":"pricing","活動範囲":"area","リンク":"links","希望する文体":"tone","希望文体":"tone","避けたい表現":"avoid"};
    const values:Record<string,string>={};let key:string|null=null;
    for(const line of text.replace(/^\uFEFF/, "").replace(/\r\n?/g,"\n").split("\n")){
      const match=line.match(/^([^：:]+)[：:](.*)$/);const next=match&&map[match[1].trim()];
      if(next){key=next;values[key]=match![2].trim();}
      else if(key)values[key]+="\n"+line;
    }
    for(const k of Object.keys(values))values[k]=values[k].trim();
    return {values,recognized:Boolean(values.businessName)};
  }
  const specs = kind === "announcement"
    ? [["1", "何を告知したいですか", "title"], ["2", "詳しい情報", "details"], ["3", "文体・必ず伝えたいこと", "style"]]
    : [["1", "事業名", "businessName"], ["2", "事業・サービス内容", "serviceDescription"]];
  const values: Record<string, string> = {};
  let key: string | null = null;
  for (const raw of text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const field = kind === "business"
      ? specs.find(([n]) => new RegExp(`^${n}[ .、　]`).test(line))
      : specs.find(([n, name]) => new RegExp(`^${n}[ .、　]*${name}`).test(line));
    if (field) { key = field[2]; continue; }
    if (/^(説明|例|使い方|利用方法)[：:]/.test(line.trim())) { if (key && Object.hasOwn(values, key)) key = null; continue; }
    if (/^\d+[ .、　]/.test(line.trim())) { key = null; continue; }
    const answer = line.match(/^回答[：:](.*)$/);
    if (answer && key) { values[key] = answer[1].trimStart(); continue; }
    if (key && Object.hasOwn(values, key)) values[key] += `${values[key] ? "\n" : ""}${line}`;
  }
  Object.keys(values).forEach((k) => values[k] = values[k].trim());
  return { values, recognized: Boolean(values[specs[0][2]]) };
}

