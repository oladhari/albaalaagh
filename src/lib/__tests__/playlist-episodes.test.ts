import {describe,expect,it} from "vitest";
import {deduplicatePlaylistEpisodes} from "../playlist-episodes";
const episode={id:"canonical",title:"حلقة 29 سبتمبر",playlist_id:"manbar",published_at:"2024-09-29T00:00:00Z",video_url:"https://media.albaalaagh.com/videos/RN96ocSCLJE.mp4"};
describe("archived episode copies",()=>{
 it("collapses hashed legacy copies only when a matching source record exists",()=>{
  const legacy={...episode,id:"legacy",published_at:"2024-09-29T22:28:24Z",video_url:`https://media.albaalaagh.com/videos/${"a".repeat(40)}.mp4`};
  const distinctVideo={...episode,id:"other",video_url:"https://www.youtube.com/watch?v=te3YUg9VnVg"};
  expect(deduplicatePlaylistEpisodes([legacy,episode,distinctVideo]).map(r=>r.id)).toEqual(["canonical","other"]);
  expect(deduplicatePlaylistEpisodes([legacy])).toEqual([legacy]);
  expect(deduplicatePlaylistEpisodes([legacy,{...episode,playlist_id:"other"}])).toHaveLength(2);
 });
 it("recognizes a YouTube and R2 copy of the same source without merging different dates by title",()=>{
  const youtube={...episode,id:"yt",video_url:"https://youtu.be/RN96ocSCLJE"};
  const legacy={...episode,id:"another-date",published_at:"2024-09-30T00:00:00Z",video_url:`https://media.albaalaagh.com/videos/${"a".repeat(40)}.mp4`};
  expect(deduplicatePlaylistEpisodes([episode,youtube,legacy]).map(r=>r.id)).toEqual(["canonical","another-date"]);
 });
});
