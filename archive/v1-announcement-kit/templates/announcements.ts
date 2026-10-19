export type Announcement = {id:string;title:string;body:string;startsAt:string;endsAt:string;detailUrl:string;snsUrl:string;isDemo:boolean;priority:number};
export function safeUrl(value:unknown):value is string {if(typeof value!=='string')return false;try{return new URL(value).protocol==='https:'}catch{return false}}
export function selectAnnouncement(raw:unknown,now=Date.now()):Announcement|null {
  if(!raw||typeof raw!=='object')return null;
  const feed=raw as {schemaVersion?:unknown;announcements?:unknown};
  if(feed.schemaVersion!==1||!Array.isArray(feed.announcements))return null;
  return feed.announcements.filter((v):v is Announcement=>{
    if(!v||typeof v!=='object')return false;
    return typeof v.id==='string'&&typeof v.title==='string'&&v.title.length>0&&v.title.length<=120&&typeof v.body==='string'&&v.body.length<=600&&typeof v.isDemo==='boolean'&&Number.isFinite(v.priority)&&safeUrl(v.detailUrl)&&(v.snsUrl===''||safeUrl(v.snsUrl))&&Date.parse(v.startsAt)<=now&&now<Date.parse(v.endsAt);
  }).sort((a,b)=>b.priority-a.priority||Date.parse(b.startsAt)-Date.parse(a.startsAt))[0]??null;
}
