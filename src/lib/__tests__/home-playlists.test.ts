import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ ranges: [] as number[][], failSecond: false }));
vi.mock("../supabase", () => ({ supabaseAdmin: { from: (table: string) => {
  const chain = { select: () => chain, eq: () => chain, not: () => chain, order: () => table === "playlists" ? Promise.resolve({data:[{id:"manbar",name:"منبر الأحد"},{id:"older",name:"برنامج قديم"}],error:null}) : chain, range: async (from:number,to:number) => {
    mocks.ranges.push([from,to]);
    if (from === 1000 && mocks.failSecond) return {data:null,error:{message:"failed"}};
    const rows=Array.from({length:1002},(_,i)=>({id:String(i),title:"Episode "+i,video_url:"https://media.albaalaagh.com/other/"+i+".mp4",playlist_id:i===1001?"older":"manbar",thumbnail_url:i===0?"newest.jpg":"older.jpg",published_at:i===0?"2026-10-24":"2024-01-01"}));
    return {data:rows.slice(from,to+1),error:null};
  } }; return chain;
} } }));
import { getHomePlaylists } from "../home-playlists";
beforeEach(()=>{mocks.ranges.length=0;mocks.failSecond=false;});
describe("homepage playlist archive",()=>{
 it("counts beyond the database response cap and includes playlists present only on later pages",async()=>{
  const result=await getHomePlaylists();expect(result).toEqual([{id:"manbar",name:"منبر الأحد",thumbnail:"newest.jpg",latestDate:"2026-10-24",count:1001},{id:"older",name:"برنامج قديم",thumbnail:"older.jpg",latestDate:"2024-01-01",count:1}]);expect(mocks.ranges).toEqual([[0,999],[1000,1999]]);
 });
 it("does not return misleading partial totals when a later page fails",async()=>{mocks.failSecond=true;await expect(getHomePlaylists()).rejects.toThrow();});
});
