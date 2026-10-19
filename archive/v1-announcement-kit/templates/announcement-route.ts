export const dynamic='force-dynamic';
export async function GET(){
 try{
  const response=await fetch('https://raw.githubusercontent.com/Kaeruka/terakoya-ai-kit/main/announcements.json?v='+Math.floor(Date.now()/60000),{headers:{'User-Agent':'TerakoyaAI-announcements'},cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error('Feed unavailable');
  const data=await response.json();return Response.json(data,{headers:{'cache-control':'no-store'}});
 }catch{return Response.json({error:'お知らせを取得できません。'},{status:502,headers:{'cache-control':'no-store'}})}
}
