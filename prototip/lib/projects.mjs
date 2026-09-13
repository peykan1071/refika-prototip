export const projectStates={active:'Devam ediyor',completed:'Tamamlandı'};
export const serviceTypes=['Proje planlama','Ortak bulma','TwinSpace desteği','Teknik destek','Yaygınlaştırma','Kalite etiketi hazırlığı','Diğer'];
const text=(input,key)=>(typeof input[key]==='string'?input[key]:'').trim();
export function saveProject(items,input,id,at=new Date().toISOString()){
  const row={id,title:text(input,'title'),school:text(input,'school'),district:text(input,'district'),topic:text(input,'topic'),esepId:text(input,'esepId'),role:text(input,'role'),status:input.status};
  if(!row.title||!row.school||!row.esepId||!row.role) throw new Error('Proje adı, ESEP proje kimliği, okul ve projedeki rolü doldurun.');
  if(!Object.hasOwn(projectStates,row.status)) throw new Error('Geçerli bir proje durumu seçin.');
  if(items.some(item=>item.esepId===row.esepId&&item.id!==id)) throw new Error('Bu ESEP proje kimliği daha önce kaydedilmiş.');
  const existing=items.find(item=>item.id===id),saved={...row,createdAt:existing?.createdAt||at,updatedAt:at};
  return existing?items.map(item=>item.id===id?saved:item):[...items,saved];
}
export function restoreProjects(value=[]){if(!Array.isArray(value))throw new Error('Proje kayıtları okunamadı.');return value.map(item=>({...saveProject([],item,item.id,item.updatedAt)[0],createdAt:item.createdAt}));}
export function saveProjectService(items,input,id,projects,at=new Date().toISOString()){
  const row={id,projectId:text(input,'projectId'),date:text(input,'date'),type:text(input,'type'),description:text(input,'description'),result:text(input,'result'),evidence:text(input,'evidence')};
  if(!projects.some(project=>project.id===row.projectId)) throw new Error('Hizmet verilecek mevcut projeyi seçin.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error('Hizmet tarihini seçin.');
  if(!serviceTypes.includes(row.type)||!row.description||!row.result) throw new Error('Hizmet türü, yapılan çalışma ve sonucu doldurun.');
  const existing=items.find(item=>item.id===id),saved={...row,createdAt:existing?.createdAt||at,updatedAt:at};
  return existing?items.map(item=>item.id===id?saved:item):[...items,saved];
}
export function restoreProjectServices(value=[],projects=[]){if(!Array.isArray(value))throw new Error('Proje hizmet kayıtları okunamadı.');return value.map(item=>({...saveProjectService([],item,item.id,projects,item.updatedAt)[0],createdAt:item.createdAt}));}
