// Scope supplied by the user. Gate labels are meeting categories, not verified POIs.
export const schools = ['广州美术学院','广州大学','中山大学','广东外语外贸大学','广州中医药大学','广东药科大学','华南理工大学','广东工业大学','华南师范大学','星海音乐学院'];
export const gates = [{id:'teaching',name:'教学区门口'}, {id:'living',name:'生活区门口'}];
export function validMeeting(school,gate){return schools.includes(school)&&gates.some(g=>g.id===gate)}
export function meetingLabel(school,gate){return validMeeting(school,gate)?`${school} · ${gates.find(g=>g.id===gate).name}`:'交接点待重新选择'}
export function platformReply(q){
 if(/学校|跨校|校外|地点|交接|门口|范围/.test(q))return '市集覆盖小谷围岛内地图中的 10 所高校。发布时选择学校及教学区／生活区门口。跨校同学在校门外公共区域交接，具体门名和时间请在聊天中确认，不安排进入校园。';
 if(/发布|照片|拍|图片|AI|步骤/i.test(q))return '发布只需三步：拍照、确认信息、选择交接点。拍完整外观和缺陷特写；图片只允许轻微提亮，原图始终保留。AI 候选信息必须由你检查后提交审核。';
 if(/历史|几手|转手|记录/.test(q))return '平台记录、上传凭证、物主陈述和未知历史分别标记。没有平台记录不等于没有交易过，AI 不会根据照片猜转手次数。';
 if(/审核|修改|价格|成交/.test(q))return '提交后进入审核工作台。修改报价需要重新确认与审核，待审时保留已发布版。当前是本地原型，审核和成交均为演示，不产生真实订单。';
 return '我可以说明发布步骤、照片要求、交接范围和历史来源。你想先了解哪一项？具体物品请进入它的聊天框，向物品助手提问。';
}
export function itemReply(q,item){
 if(!item?.confirmed)return '这件物品还没有可供助手引用的卖家确认资料，请等待卖家补充。';
 if(/忽略|扮演|指令|系统提示|付款|转账|担保|保修|保证|最低|便宜|议价|几点|明天|今天|还在|有货|卖掉/.test(q))return '这项需要卖家亲自确认。我不能替卖家议价、承诺时间、库存或交易保障。';
 if(/价格|多少钱|报价/.test(q))return `卖家确认的当前报价是 ${Number(item.price)===0?'免费':`¥${item.price}`}。议价请等卖家本人回复。`;
 if(/交接|哪里|地址|校外|跨校|地点/.test(q))return validMeeting(item.school,item.gate)?`卖家选择的交接范围：${meetingLabel(item.school,item.gate)}。跨校仅在校门外交接，具体门名、见面位置与时间由双方确认。`:'尚未设置规定范围内的交接点，请卖家补充。跨校只在校门外交接。';
 if(/历史|几手|转手/.test(q))return `平台已记录 ${item.platform?.length||0} 次，上传凭证 ${item.uploaded?.length||0} 条。更早历史未知，不能据此推断总转手次数。`;
 if(/状况|缺陷|功能|瑕疵|配件|尺寸|介绍/.test(q))return `以下是卖家确认的描述：\n${item.description}\n未提及的信息需要卖家补充，助手不会推测。`;
 if(item.sellerFaq?.trim())return `卖家预设的补充说明：\n${item.sellerFaq}\n若没有回答你的问题，请等卖家本人确认。`;
 return '卖家还没有预设这方面的信息。你可以询问报价、物品描述、历史来源或交接范围；其他问题请等待卖家回复。';
}
