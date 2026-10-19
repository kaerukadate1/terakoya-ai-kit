"use client";
import {useEffect,useState} from 'react';
import {selectAnnouncement,type Announcement} from '@/lib/announcements';
const FEED='/api/announcements';
export function AnnouncementCard(){
 const [item,setItem]=useState<Announcement|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;let controller:AbortController|undefined;let sequence=0;
 const refresh=async()=>{controller?.abort();controller=new AbortController();const current=controller;const ticket=++sequence;const timer=setTimeout(()=>current.abort(),8000);try{const r=await fetch(FEED+'?v='+Math.floor(Date.now()/60000),{cache:'no-store',signal:current.signal,credentials:'same-origin'});if(!r.ok)throw new Error();const data=await r.json();if(active&&ticket===sequence){setItem(selectAnnouncement(data));setFailed(false)}}catch{if(active&&ticket===sequence){setItem(old=>old&&Date.parse(old.endsAt)>Date.now()?old:null);setFailed(true)}}finally{clearTimeout(timer)}};
 void refresh();const id=setInterval(()=>void refresh(),60000);const focus=()=>void refresh();window.addEventListener('focus',focus);return()=>{active=false;controller?.abort();clearInterval(id);window.removeEventListener('focus',focus)}},[]);
 useEffect(()=>{if(!item)return;const delay=Date.parse(item.endsAt)-Date.now();if(delay>2147483647)return;const t=setTimeout(()=>setItem(null),Math.max(delay,0));return()=>clearTimeout(t)},[item]);
 if(!item)return failed?<p className="announcement-empty">お知らせを取得できません。ツールは引き続き使えます。</p>:null;
 return <section className="announcement-card" aria-label="寺子屋AIからのお知らせ"><p className="announcement-label">寺子屋AIからのお知らせ {item.isDemo&&<span>デモ</span>}</p><h2>{item.title}</h2><p>{item.body}</p><a href={item.detailUrl} target="_blank" rel="noopener noreferrer">詳細を見る ↗</a>{item.snsUrl&&<a href={item.snsUrl} target="_blank" rel="noopener noreferrer">{item.isDemo?'SNS連携の作例':'SNS投稿を見る'} ↗</a>}{failed&&<small>更新を確認できません。前回取得した案内です。</small>}</section>;
}
