import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({fb:vi.fn(),ig:vi.fn(),telegram:vi.fn(),x:vi.fn(),li:vi.fn(),buffer:vi.fn()}));
vi.mock("../facebook",()=>({postArticleToFacebook:mocks.fb}));
vi.mock("../instagram",()=>({postArticleToInstagram:mocks.ig}));
vi.mock("../telegram",()=>({postToTelegram:mocks.telegram}));
vi.mock("../twitter",()=>({postToX:mocks.x}));
vi.mock("../linkedin",()=>({postToLinkedIn:mocks.li}));
vi.mock("../buffer-news",()=>({postContentToBufferNetwork:mocks.buffer}));
import {shareToAll} from "../share";
beforeEach(()=>Object.values(mocks).forEach(m=>m.mockReset().mockResolvedValue(undefined)));
describe("news publish button dispatch",()=>{
 it("uses both Buffer channels for news and never invokes direct X/LinkedIn",async()=>{const opts={type:"news" as const,title:"خبر",slug:"news",facebook_image:"https://media.albaalaagh.com/square.png"};await shareToAll(opts);expect(mocks.buffer.mock.calls).toEqual([[opts,"twitter"],[opts,"linkedin"]]);expect(mocks.x).not.toHaveBeenCalled();expect(mocks.li).not.toHaveBeenCalled();expect(mocks.fb).toHaveBeenCalledWith(opts);expect(mocks.ig).toHaveBeenCalledWith(opts);});
 it.each(["article","report","programme"] as const)("uses independent Buffer channels for %s publication",async(type)=>{const opts={type,title:"مقال",slug:"item",image:"https://media.albaalaagh.com/cover.jpg"};await shareToAll(opts);expect(mocks.buffer.mock.calls).toEqual([[opts,"twitter"],[opts,"linkedin"]]);expect(mocks.x).not.toHaveBeenCalled();expect(mocks.li).not.toHaveBeenCalled();expect(mocks.fb).toHaveBeenCalledWith(opts);expect(mocks.ig).toHaveBeenCalledWith(opts);expect(mocks.telegram).toHaveBeenCalledWith(opts);});
 it("does not prevent other destinations after a Buffer failure",async()=>{const log=vi.spyOn(console,"error").mockImplementation(()=>{});mocks.buffer.mockRejectedValue(new Error("Buffer unavailable"));await shareToAll({type:"news",title:"خبر",slug:"news"});expect(mocks.fb).toHaveBeenCalledOnce();expect(mocks.ig).toHaveBeenCalledOnce();expect(mocks.x).not.toHaveBeenCalled();expect(log).toHaveBeenCalled();log.mockRestore();});
});
