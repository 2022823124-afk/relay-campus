// Local reading aid: quote complete owner sentences; never infer a verified condition.
const text = value => typeof value === 'string' ? value.trim() : '';
const facet = (label, pattern, question) => ({label, pattern, question});
const definitions = {
 price: {label:'价格', facets:[facet('议价说明', /议价|讲价|刀|不议/, '这个报价还能商量吗？'), facet('包含物品', /包含|不含|附带|配件|一起送|齐全/, '这个报价具体包含哪些物品或配件？'), facet('领取安排', /自提|送货|运费|搬运|取货/, '需要自提吗，搬运或取货有没有额外费用？')]},
 clean: {label:'清洁', facets:[facet('清洁情况', /清洁|清洗|消毒|干净|未洗|没洗/, '交接前是否清洁过，哪些部位需要再清理？'), facet('污渍与异味', /污渍|污迹|异味|霉|发黄|油渍/, '有没有难清理的污渍、霉斑或异味？')]},
 condition: {label:'新旧', facets:[facet('使用时间', /使用[了过]?\s*[一二三四五六七八九十半\d]+\s*[年月天周]|用了|买了|购于|购入|买来|使用时长/, '大概买了多久、实际使用了多久？'), facet('磨损与缺陷', /磨损|划痕|痕迹|破损|缺陷|损坏|裂|掉漆|缺页|笔记|标记|完整/, '有哪些磨损或缺陷，能补一张细节照片吗？')]},
 function: {label:'功能 / 电池', facets:[facet('功能情况', /功能|正常|故障|失灵|试机|试听|按键/, '主要功能都测试过吗，有没有异常？'), facet('供电与续航', /电池|续航|充电|电源|供电/, '这件设备怎样供电？如果用电池，续航和电池状况如何？')]},
 edition: {label:'版本 / 笔记', facets:[facet('版本信息', /ISBN|版次|第.{1,5}版|出版社|出版年份/i, '可以拍一下版权页，确认版本和出版年份吗？'), facet('内页情况', /笔记|标记|划线|缺页|内页|完整/, '内页有没有笔记、划线或缺页？')]},
 care: {label:'养护', facets:[facet('光照与浇水', /光|浇水|干了|湿度/, '平时需要怎样的光照、多久浇一次水？'), facet('生长情况', /长势|虫|病|黄叶|烂根/, '最近有没有黄叶、虫害或其他养护问题？')]},
 supplies: {label:'拆封 / 余量', facets:[facet('拆封情况', /拆封|开封|未开|密封/, '这件物品是否拆封，开封多久了？'), facet('剩余数量', /剩余|还剩|余量|剩下|共\s*\d+/, '实际还有多少，可以补一张数量或包装照片吗？')]},
};
export function getFocusOptions(item={}) {
 const keys=['price','clean','condition'];
 if(item.category==='数码装备')keys.push('function');
 if(item.category==='书籍文具' && /书|诗集|教材|课本|小说|词典|字典|绘本|读本/.test(text(item.name)))keys.push('edition');
 if(item.category==='绿植生活')keys.push('care');
 if(/纸巾|抽纸|卷纸|一包纸|洗衣液|洗手液|洗发|沐浴|洗洁精/.test(text(item.name)))keys.push('supplies');
 return keys.map(key=>[key,definitions[key].label]);
}
export function buildFocus(item={}, requested='price') {
 const options=getFocusOptions(item);
 const key=options.some(([value])=>value===requested)?requested:'price';
 const definition=definitions[key];
 const sentences=text(item.description).split(/(?<=[。！？!?；;\n])/u).map(s=>s.trim()).filter(Boolean);
 const facts=[];
 if(key==='price' && item.price!=='' && item.price!=null && Number.isFinite(Number(item.price)) && Number(item.price)>=0)facts.push({label:'物主报价',value:Number(item.price)===0?'免费接力 · 物品费用为 ¥0':`¥${Number(item.price)}`});
 if(key==='condition' && text(item.condition) && !/见.*描述|未知|未说明|待确认/.test(item.condition))facts.push({label:'物主标注',value:text(item.condition)});
 const missing=[];
 const questions=[];
 const seen=new Set();
 const fields=key==='price' && Number(item.price)===0 && item.price!=='' && item.price!=null?definition.facets.filter(field=>field.label!=='议价说明'):definition.facets;
 for(const field of fields){
  const matches=sentences.filter(sentence=>field.pattern.test(sentence));
  if(matches.length){
   for(const sentence of matches)if(!seen.has(sentence)){seen.add(sentence);facts.push({label:'物主原文',value:sentence});}
   if(matches.some(sentence=>/未知|不清楚|不确定|待确认|未测试|未检查/.test(sentence)))questions.push(field.question);
  }else{missing.push(field.label);questions.push(field.question);}
 }
 // A fallback asks for clarification, rather than inventing another missing fact.
 if(!questions.length)questions.push(`关于${definition.label}，除了描述里的情况，还有需要特别提醒的地方吗？`);
 const selectedQuestions=questions.slice(0,2);
 return {key,label:definition.label,options,facts,missing,questions:selectedQuestions,
  message:`你好，我对「${text(item.name)||'这件物品'}」感兴趣，比较在意${definition.label}。${selectedQuestions.join('')}`,
  context:`买家当前更在意：${definition.label}。报价：${item.price??'未知'}；物主标注：${text(item.condition)||'未说明'}。描述未提及的方面：${missing.join('、')||'请以原描述为准'}。优先围绕该关注点询问，不重复已有信息，不承诺购买。`};
}
