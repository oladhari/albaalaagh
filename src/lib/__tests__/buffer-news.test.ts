import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const store = vi.hoisted(() => new Map<string, string>());
vi.mock("../supabase", () => ({ supabaseAdmin: { from: () => ({
  insert: async ({key,value}: {key:string;value:string}) => {
    if(store.has(key)) return {error:{code:"23505"}};
    store.set(key,value);return {error:null};
  },
  update: ({value}: {value:string}) => ({eq: async (_:string,key:string) => {store.set(key,value);return {error:null};}}),
  select: () => ({eq: (_:string,key:string) => ({single: async () => ({data:{value:store.get(key)},error:null})}),like: () => ({limit: async () => ({data:[...store].map(([key,value])=>({key,value})),error:null})})}),
})} }));
import { newsBufferInput, newsBufferKey, postNewsToBufferNetwork, syncBufferNews } from "../buffer-news";
const opts={sourceId:"news:stable-id",type:"news" as const,slug:"item",title:"عنوان الخبر",excerpt:"ملخص الخبر",facebook_image:"https://media.albaalaagh.com/square.png"};
const fetcher=vi.fn();
beforeEach(()=>{store.clear();fetcher.mockReset();vi.stubEnv("BUFFER_TIKTOK_API","test-key");vi.stubEnv("BUFFER_X_CHANNEL_ID","x-channel");vi.stubEnv("BUFFER_LINKEDIN_CHANNEL_ID","li-channel");vi.stubGlobal("fetch",fetcher);});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
function respond(status="sent") {fetcher.mockImplementation(async (_url,init) => {
 const body=JSON.parse(init.body);const input=body.variables.input;
 const post={id:"post-"+input.channelId,channelId:input.channelId,status,externalLink:status==="sent"?"https://example.com/post":null};
 return {ok:true,json:async()=>({data:{createPost:{__typename:"PostActionSuccess",post}}})};
});}
describe("Buffer news publication",()=>{
 it("keeps complete links, square image and hashtags within X/LinkedIn limits",()=>{
  for(const network of ["twitter","linkedin"] as const){const input=newsBufferInput({...opts,title:"عنوان طويل ".repeat(100),excerpt:"ملخص طويل ".repeat(1000)},network,"target");expect([...input.text].length).toBeLessThanOrEqual(network==="twitter"?280:3000);expect(input.text).toContain("https://www.albaalaagh.com/taqrir/item");expect(input.text).toContain("#البلاغ #تونس");expect(input.assets).toEqual([{image:{url:opts.facebook_image}}]);expect(input.mode).toBe("shareNow");}
 });
 it("does not fall back to a landscape image when the square asset is missing",()=>{expect(()=>newsBufferInput({...opts,facebook_image:null,image:"https://media.albaalaagh.com/landscape.jpg"},"twitter","target")).toThrow("square image");});
 it("claims a source atomically across concurrent calls and prevents duplicate submissions",async()=>{respond();await Promise.allSettled([postNewsToBufferNetwork(opts,"twitter"),postNewsToBufferNetwork(opts,"twitter")]);expect(fetcher).toHaveBeenCalledTimes(1);await postNewsToBufferNetwork({...opts,slug:"new-slug"},"twitter");expect(fetcher).toHaveBeenCalledTimes(1);expect(JSON.parse([...store.values()][0]).state).toBe("sent");});
 it("does not resubmit after an unknown network outcome",async()=>{fetcher.mockRejectedValueOnce(new Error("timeout"));await expect(postNewsToBufferNetwork(opts,"twitter")).rejects.toThrow("timeout");await expect(postNewsToBufferNetwork(opts,"twitter")).rejects.toThrow("unknown previous outcome");expect(fetcher).toHaveBeenCalledTimes(1);});
 it("keeps X and LinkedIn delivery independent",async()=>{respond();await postNewsToBufferNetwork(opts,"twitter");await postNewsToBufferNetwork(opts,"linkedin");expect(fetcher).toHaveBeenCalledTimes(2);expect(store.size).toBe(2);});
 it("persists an API rejection without claiming delivery or blindly retrying",async()=>{fetcher.mockResolvedValueOnce({ok:false,status:429});await expect(postNewsToBufferNetwork(opts,"linkedin")).rejects.toThrow("429");expect(JSON.parse([...store.values()][0]).state).toBe("unknown");});
 it("only reads pending post IDs during delivery reconciliation",async()=>{respond("sending");await postNewsToBufferNetwork(opts,"linkedin");fetcher.mockResolvedValueOnce({ok:true,json:async()=>({data:{post:{id:"post-li-channel",channelId:"li-channel",status:"sent",externalLink:"https://linkedin.com/post"}}})});expect(await syncBufferNews()).toEqual({checked:1});expect(JSON.parse([...store.values()][0]).state).toBe("sent");expect(await syncBufferNews()).toEqual({checked:0});expect(fetcher).toHaveBeenCalledTimes(2);});
 it("uses stable source IDs rather than a newly generated slug for duplicate detection",()=>{expect(newsBufferKey(opts,"twitter","x")).toBe(newsBufferKey({...opts,slug:"changed"},"twitter","x"));});
});
