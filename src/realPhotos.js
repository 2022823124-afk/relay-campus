// Real photographs supplied for the demonstration market. Never rewrite user listings.
const replacements = {
 'ITEM-0003': {previous:'chair', name:'闲置的黑色折叠休闲椅',img:'secondhand-chair',condition:'实拍看成色',description:'黑色布面折叠椅，照片保留日常环境与布面褶皱。椅架稳定性、尺寸和收折情况需向物主确认，建议见面检查后再决定。',platform:[],uploaded:[]},
 'ITEM-0004': {previous:'plant', name:'阳台上的白花盆栽，想找个新家',img:'secondhand-flowers',condition:'当前状态见图',description:'阳台实拍的白花盆栽，保留自然光下的花叶状态。具体品种、养护情况以及是否含盆，请向物主确认。照片不能代表交接当天的长势。',platform:[],uploaded:[]},
 'ITEM-0005': {previous:'books', name:'两块闲置木质板材，留给需要的同学',img:'secondhand-boards',condition:'尺寸待确认',description:'实拍为一大一小两块木质板材，可见表面纹理及边框。具体材质、尺寸、背面状况和是否适合作画需向物主核实，建议当面查看。',platform:[],uploaded:[]}
};
export function refreshDemoPhotos(items){
 return items.map(item=>{
  const replacement=replacements[item.id];
  if(!replacement||item.image||item.version||item.sold||item.img!==replacement.previous)return item;
  const {previous,...fields}=replacement;
  return {...item,...fields};
 });
}
