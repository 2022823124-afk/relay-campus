export const categories=['数码装备','书籍文具','宿舍好物','绿植生活'];

// Offline convenience only: copy the owner's words, never claim image recognition.
export function draftFromNote(note=''){
 const text=note.trim();
 const offers=[...text.matchAll(/(?:想卖|售价|报价|现价|卖价)\s*[：:]?\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)(?=元|块|[，。！,;；\s]|$)/g)];
 const price=offers.length===1?offers[0][1]:'';
 const category=[[/相机|耳机|手机|键盘|鼠标/,'数码装备'],[/书|文具|板材/,'书籍文具'],[/盆栽|绿植|花盆/,'绿植生活'],[/台灯|椅|桌|收纳|衣架/,'宿舍好物']].find(([r])=>r.test(text))?.[1]||'';
 return {name:text.split(/[，。；\n]/)[0].slice(0,40),description:text,category,price};
}

export function validPrice(value){return String(value).trim()!==''&&Number.isFinite(Number(value))&&Number(value)>=0;}

export function validatePublish(d){
 if(!d.image)return '先添加一张物品照片。';
 if(!d.name.trim())return '补一个物品名称，就能继续。';
 if(!d.description.trim())return '简单说说物品状况，不确定的地方可以写未知。';
 if(!categories.includes(d.category))return '请确认物品分类。';
 if(!validPrice(d.price))return '请确认你的报价，免费送可以填 0。';
 if(d.history==='upload'&&(!d.proof||!d.source.trim()))return '请添加历史凭证和来源；看不清的价格可以留空。';
 if(d.history==='upload'&&d.previousPrice!==''&&!validPrice(d.previousPrice))return '历史价格应是非负数字，无法确认可以留空。';
 return '';
}

export const followups={
 function:{title:'功能使用情况？',choices:['已试用，功能正常','存在功能问题，见描述','未测试，功能未知']},
 defects:{title:'有没有需要特别提醒的地方？',choices:['有磨损或缺陷，见描述','未仔细检查，见实物确认']},
 accessories:{title:'配件是否齐全？',choices:['包含的配件见描述','配件情况未知']},
};

export function answerDescription(base,answers){return [base.trim(),...Object.values(answers)].filter(Boolean).join('\n');}
