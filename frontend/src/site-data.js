import content from './site-defaults.json';
export const services=content.services;
export const serviceOptions=services.map(({id,title})=>({id,title}));
export const defaultContent=content;
export const faqs=content.faq.items.map(({question,answer})=>[question,answer]);
