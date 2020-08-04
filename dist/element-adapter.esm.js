const e=e=>e.length>0?Array.from(new Set(e)):e,t=(e,t)=>r=>e*r[t],r=e=>()=>e,s=(e,t)=>{const r=typeof e,s=typeof t;if(r===s)return!0;throw new Error(`type mismatch: a(${e}) is ${r} and b(${t}) is ${s}`)};var n={">":e=>(t,r)=>{const n=e(t);return s(r,n)&&r>n},">=":e=>(t,r)=>{const n=e(t);return s(r,n)&&r>=n},"<":e=>(t,r)=>{const n=e(t);return s(r,n)&&r<n},"<=":e=>(t,r)=>{const n=e(t);return s(r,n)&&r<=n},"==":e=>(t,r)=>{const n=e(t);return s(r,n)&&r===e(t)}};const i={width:"w%",height:"h%"},o=Object.entries(i).reduce((e,[t,r])=>({...e,[r]:t}),{}),c=(e,t,r)=>{if(0===t.length)return;const s=document.createElement("b");s.style.position="absolute",e.appendChild(s);const n=t.reduce((e,t)=>({...e,[t]:r(s,t)}),{});return e.removeChild(s),n},a=(e,t)=>c(e,t,(e,t)=>(e.style.width="1"+t,e.getBoundingClientRect().width)),p=(e,t)=>c(e.parentNode,t,(e,t)=>{const r=o[t];e.style[r]="1%";const{[r]:s}=e.getBoundingClientRect();return s}),u=e=>["width","height"].includes(e),h=(e,t)=>e>t?"landscape":e<t?"portrait":"square",d=(e,t)=>e/t,l=["width","height","aspect-ratio","orientation","children","characters"],m=["%","cap","ch","em","ex","ic","lh","rem","rlh","vb","vh","vi","vw","vmin","vmax","mm","Q","cm","in","pt","pc"],w=new RegExp(`^(\\d+(\\.\\d+)?)(${m.join("|")})$`),g=/^\d+(\.\d+)?(px)?$/,f=e=>{const s=e.trim().toLowerCase().split(/\s*,\s*/),o=[],c=[],a=[],p=[];for(const e of s){const s=e.split(/\s*&&\s*/),u=[];for(const e of s){const[s,o,h]=e.split(/\s+/),[,d,,l]=h.match(w)||[],m="%"===l?i[s]:l,f=m&&parseFloat(d);let b;if(p.push(s),m)("%"===l?a:c).push(m),b=t(f,m);else{const e=h.match(g)?parseFloat(h):h;b=r(e)}u.push({[s]:n[o](b)})}o.push(u)}return{query:o,units:c,percentUnits:a,watchedProperties:p}},b=({query:e,unitsMeasurements:t,props:r})=>e.some(e=>e.every(e=>{const[[s,n]]=Object.entries(e);return n(t,r[s])})),v=e=>"INPUT"===e.tagName&&!["button","submit","image"].includes(e.getAttribute("type"))||"TEXTAREA"===e.tagName,E=e=>v(e)?e.value.trim().length:e.isContentEditable?e.textContent.trim().length:0,y=e=>e.isContentEditable,C=e=>e.parentElement.isContentEditable?C(e.parentElement):e,q=(e,t,r=!1)=>{e.observe(t,{childList:!0,characterData:r,subtree:r})},O=({elt:e,props:t,queries:r,units:s,percentUnits:n})=>{(({elt:e,props:t,queries:r,unitsMeasurements:s})=>{const n={...t,characters:t.characters||0,children:t.children||0};for(const[t,i]of Object.entries(r))e.classList.toggle(t,b({query:i,unitsMeasurements:s,props:n}));for(const[r,s]of Object.entries(t))e.style.setProperty("--ea-"+r,u(r)?s+"px":s)})({elt:e,props:t,queries:r,unitsMeasurements:{...a(e,s),...p(e,n)}})},P=e=>{const t=["width","height","orientation","aspect-ratio"];return e.some(e=>t.includes(e))},U=e=>e.includes("characters"),$=(e,t)=>U(e)&&t.isContentEditable,j=e=>e.includes("children"),A=(e,t)=>{const r={};if(P(t)){const{clientWidth:t,clientHeight:s}=e,{paddingTop:n,paddingRight:i,paddingBottom:o,paddingLeft:c}=window.getComputedStyle(e),a=t-(parseInt(c,10)+parseInt(i,10)),p=s-(parseInt(n,10)+parseInt(o,10));Object.assign(r,{width:a,height:p,orientation:h(a,p),"aspect-ratio":d(a,p)})}return U(t)&&(e.isContentEditable||v(e))&&(r.characters=E(e)),!j(t)||e.isContentEditable||v(e)||(r.children=e.childElementCount),r},L=`((width|height)\\s+(((>|<)=?)|==)\\s+\\d+(\\.\\d+)?(${m.join("|")}|px)|(characters|children)\\s+(((>|<)=?)|==)\\s+\\d+|aspect-ratio\\s+(((>|<)=?)|==)\\s+\\d+(\\.\\d+)?|orientation\\s+==\\s+(landscape|portrait|square))`,x=`${L}(\\s+&&\\s+${L})*`,Q=new RegExp(`^\\s*${x}(\\s*,\\s*${x})*\\s*$`);export default function({target:t,queries:r={},...s}={}){(e=>{for(const t of Object.values(e))if(!t||!t.match(Q))throw new Error(`invalid query "${t}"`)})(r),(({watchedProperties:e})=>{if(e){if(!Array.isArray(e))throw new Error("watchedProperties must be an array");if(e.length<1||!e.every(e=>l.includes(e)))throw new Error("watchedProperties must be an array with at least one of "+l.join(", "))}})(s);const n=(e=>{if(!e)throw new Error("target must be provided");const t="length"in Object(e)?Array.isArray(e)?e:Array.from(e):[e];if(t.length<1)throw new Error("at least one Element must be provided as target");if(t.some(e=>!(e instanceof window.Element)))throw new Error(`target must be an Element or a list of Elements. Actual:\n[${t.map(e=>String(e)).join(", ")}]`);return t})(t),{compiledQueries:i,units:o,percentUnits:c,watchedProperties:a}=(t=>{const r={},s=[],n=[],i=[];for(const[e,o]of Object.entries(t)){const t=f(o);r[e]=t.query,s.push(...t.units),n.push(...t.percentUnits),i.push(...t.watchedProperties)}return{compiledQueries:r,units:e(s),percentUnits:e(n),watchedProperties:e(i)}})(r);if(a.length<1&&!s.watchedProperties)throw new Error("at least one query or one watched properties must be provided");return(e=>{const{ResizeObserver:t,MutationObserver:r}=window,s=new WeakMap,n={...e,propsCache:s},{elements:i,compiledQueries:o,units:c,percentUnits:a,watchedProperties:p}=e,u=P(p)&&(({propsCache:e,compiledQueries:t,units:r,percentUnits:s})=>n=>{for(const{contentRect:{width:i,height:o},target:c}of n){const n={...e.get(c),width:i,height:o,orientation:h(i,o),"aspect-ratio":d(i,o)};e.set(c,n),window.requestAnimationFrame(()=>O({elt:c,props:n,queries:t,units:r,percentUnits:s}))}})(n),m=u&&new t(u),w=U(p)&&i.some(v)&&(({propsCache:e,compiledQueries:t,units:r,percentUnits:s})=>({target:n})=>{const i=n.value.trim().length,o=e.get(n);if(i!==o.characters){const i={...o,characters:E(n)};e.set(n,i),O({elt:n,props:i,queries:t,units:r,percentUnits:s})}})(n),g=(j(p)&&!i.every(v)||U(p)&&i.some(y))&&(({propsCache:e,compiledQueries:t,units:r,percentUnits:s,elements:n,watchedProperties:i})=>(o,c)=>{c.disconnect();for(const{type:n,target:c}of o){const{parentElement:o}=c;if(o&&["childList","characterData"].includes(n)){let n;n=c.nodeType!==window.Node.TEXT_NODE?$(i,c)?C(c):c:C(o);const a={...e.get(n)};!j(i)||n.isContentEditable||v(n)||(a.children=n.childElementCount),$(i,n)&&(a.characters=E(n)),e.set(n,a),O({elt:n,props:a,queries:t,units:r,percentUnits:s})}}for(const e of n)q(c,e,$(i,e))})(n),f=g&&new r(g);for(const e of i){const t=A(e,p);s.set(e,t),m&&m.observe(e),w&&v(e)&&e.addEventListener("input",w);const r=$(p,e);f&&(r||j(p))&&f&&q(f,e,r),O({elt:e,props:t,queries:o,units:c,percentUnits:a})}return()=>(({elements:e,mutationObserver:t,resizeObserver:r,inputListener:s,behaviourCssClasses:n})=>{t&&t.disconnect();for(const t of e)r&&r.unobserve(t),s&&v(t)&&t.removeEventListener("input",s),t.classList.remove(...n),l.map(e=>t.style.removeProperty("--ea-"+e))})({elements:i,mutationObserver:f,resizeObserver:m,inputListener:w,behaviourCssClasses:Object.keys(o)})})({elements:n,compiledQueries:i,units:o,percentUnits:c,watchedProperties:e([...a,...s.watchedProperties||[]])})}
