/* Rocket Print V54.1 staging migration — consent-aware website metrics.
   Tracking identifiers are selected by hostname. Only approved product metadata is sent;
   never customer names, emails, phone numbers, messages, uploaded files, payment details,
   order IDs, session IDs, or URL query strings.
   United States visitors: analytics cookies enabled unless explicitly disabled.
   Other/unknown regions: disabled until the visitor explicitly enables them.
*/
(function(){
  'use strict';
  var hostname=window.location.hostname.toLowerCase();
  var production=(hostname==='rocketprinttx.com'||hostname==='www.rocketprinttx.com');
  var staging=(hostname==='test.rocketprinttx.com'||hostname==='rocketprint-website.pages.dev'||hostname.endsWith('.rocketprint-website.pages.dev'));
  var config=production?{ga:'G-TLE6SFNJCW',clarity:'z4xfztrcy1',env:'production'}
    :staging?{ga:'G-9QTQ220VTZ',clarity:'z4xi500iio',env:'staging'}:null;
  var storageKey='rocketprint_analytics_consent_v1';
  var explicitChoice=null;
  try{
    var saved=window.localStorage.getItem(storageKey);
    if(saved==='granted'||saved==='denied')explicitChoice=saved;
  }catch(e){}
  var permission=explicitChoice||'denied';
  var deciding=!explicitChoice && !!config;
  var loaded=false;
  var choiceChanged=false;
  function consentObject(status){return {
    analytics_storage:status,
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied'
  };}
  function updateButtons(){
    var el=document.getElementById('rpPrivacyConsentStatus');
    if(el)el.textContent=deciding?'Checking your analytics setting…':permission==='granted'?'Analytics cookies: enabled':'Analytics cookies: disabled';
  }
  function clearAnalyticsCookies(){
    try{
      var names=document.cookie.split(';').map(function(part){return part.split('=')[0].trim();}).filter(function(name){
        return /^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_clck$|_clsk$)/.test(name);
      });
      var domains=['',hostname,'.'+hostname,'.rocketprinttx.com'];
      names.forEach(function(name){domains.forEach(function(domain){
        document.cookie=name+'=; Max-Age=0; Path=/; SameSite=Lax'+(domain?'; Domain='+domain:'');
      });});
    }catch(e){}
  }
  function startAnalytics(){
    if(!config || loaded || permission!=='granted')return;
    loaded=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
    window['ga-disable-'+config.ga]=false;
    window.gtag('consent','default',consentObject('granted'));
    window.gtag('set','allow_google_signals',false);
    window.gtag('set','allow_ad_personalization_signals',false);
    window.gtag('js',new Date());
    window.gtag('config',config.ga,{send_page_view:false});
    window.gtag('event','page_view',{
      page_title:document.title,
      page_location:window.location.origin+window.location.pathname,
      page_path:window.location.pathname
    });
    var google=document.createElement('script');
    google.async=true;
    google.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(config.ga);
    document.head.appendChild(google);
    window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments);};
    window.clarity('consentv2',{ad_Storage:'denied',analytics_Storage:'granted'});
    var clarity=document.createElement('script');
    clarity.async=true;
    clarity.src='https://www.clarity.ms/tag/'+encodeURIComponent(config.clarity);
    document.head.appendChild(clarity);
  }
  function applyConsent(value,persist){
    deciding=false;
    permission=value==='granted'?'granted':'denied';
    if(persist){
      choiceChanged=true;
      try{window.localStorage.setItem(storageKey,permission);}catch(e){}
    }
    if(loaded && config){
      window['ga-disable-'+config.ga]=permission==='denied';
      window.gtag('consent','update',consentObject(permission));
      window.clarity('consentv2',{ad_Storage:'denied',analytics_Storage:permission});
      if(permission==='denied'){
        window.clarity('consent',false);
        clearAnalyticsCookies();
      }
    }
    if(permission==='granted')startAnalytics();
    updateButtons();
  }
  window.rocketPrivacy={
    getConsent:function(){return permission;},
    setConsent:function(value){applyConsent(value,true);}
  };
  function safeText(input){
    if(typeof input!=='string')return '';
    return input.slice(0,100).replace(/[^a-zA-Z0-9 \-\|.&]/g,'');
  }
  function track(eventName,params){
    if(!loaded || permission!=='granted' || !(/^[a-z][a-z0-9_]{0,39}$/).test(eventName))return;
    var safe={};
    var allowed=['item_name','option_type','option_value','form_type','lead_type','submission_status'];
    allowed.forEach(function(key){if(params && typeof params[key]==='string')safe[key]=safeText(params[key]);});
    window.gtag('event',eventName,safe);
  }
  function makeItem(item){
    if(!item)return null;
    var name=safeText(item.design||'');
    var garment=safeText(item.garment||'');
    var color=safeText(item.color||'');
    var size=safeText(item.size||'');
    var price=Number(item.unitPrice);
    var quantity=Number(item.quantity)||1;
    if(!name||!garment||!Number.isFinite(price)||price<0)return null;
    return {
      item_id:[name,garment,color,size].join('|').slice(0,150),item_name:name,
      item_category:garment,item_variant:[color,size].filter(Boolean).join(' / '),
      price:price,quantity:Math.max(1,Math.min(100,quantity))
    };
  }
  function itemEvent(eventName,item){
    if(!loaded || permission!=='granted')return;
    var obj=makeItem(item);
    if(obj)window.gtag('event',eventName,{currency:'USD',value:obj.price*obj.quantity,items:[obj]});
  }
  function cartEvent(eventName,items){
    if(!loaded || permission!=='granted' || !Array.isArray(items))return;
    var safeItems=items.map(makeItem).filter(Boolean);
    if(safeItems.length)window.gtag('event',eventName,{
      currency:'USD',value:safeItems.reduce(function(sum,item){return sum+item.price*item.quantity;},0),
      items:safeItems
    });
  }
  window.rocketAnalytics={track:track,itemEvent:itemEvent,cartEvent:cartEvent,environment:config?config.env:'disabled'};
  document.querySelectorAll('[data-rp-consent]').forEach(function(button){
    button.addEventListener('click',function(){applyConsent(button.getAttribute('data-rp-consent'),true);});
  });
  updateButtons();
  if(!config){deciding=false;updateButtons();return;}
  if(explicitChoice){applyConsent(explicitChoice,false);return;}
  // Only enable cookies automatically after a same-origin, edge-derived US country check.
  // Unknown country or lookup errors fail closed. No external tag loads while this check runs.
  var completed=false;
  var timeout=setTimeout(function(){
    if(completed||choiceChanged)return;
    completed=true;
    applyConsent('denied',false);
  },4500);
  fetch('/analytics-region',{credentials:'same-origin',cache:'no-store'})
    .then(function(response){if(!response.ok)throw Error('Region lookup failed');return response.json();})
    .then(function(data){
      if(completed||choiceChanged)return;
      completed=true;clearTimeout(timeout);
      applyConsent(data && data.us===true?'granted':'denied',false);
    })
    .catch(function(){
      if(completed||choiceChanged)return;
      completed=true;clearTimeout(timeout);
      applyConsent('denied',false);
    });
})();
