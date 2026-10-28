/* Rocket Print V54 staging migration — privacy-first GA4 + Microsoft Clarity.
   Loads separate projects based on verified hostname. Does not send form fields, checkout PII,
   untrusted messages, uploaded files, order IDs, session IDs or URL query strings. */
(function(){
  'use strict';
  var hostname=window.location.hostname.toLowerCase();
  var production=(hostname==='rocketprinttx.com'||hostname==='www.rocketprinttx.com');
  var staging=(hostname==='test.rocketprinttx.com'||hostname==='rocketprint-website.pages.dev'||hostname.endsWith('.rocketprint-website.pages.dev'));
  var config=production?{ga:'G-TLE6SFNJCW',clarity:'z4xfztrcy1',env:'production'}
    :staging?{ga:'G-9QTQ220VTZ',clarity:'z4xi500iio',env:'staging'}:null;
  var storageKey='rocketprint_analytics_consent_v1';
  var permission='denied';
  try {permission=localStorage.getItem(storageKey)==='granted'?'granted':'denied';}catch(e){}
  function consentObject(status){return {
    analytics_storage:status,
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied'
  };}
  function updateButtons(){
    var el=document.getElementById('rpPrivacyConsentStatus');
    if(el){el.textContent=permission==='granted'?'Analytics cookies: allowed':'Analytics cookies: not allowed';}
  }
  function setConsent(value){
    permission=value==='granted'?'granted':'denied';
    try{localStorage.setItem(storageKey,permission);}catch(e){}
    if(config){
      window.gtag('consent','update',consentObject(permission));
      window.clarity('consentv2',{ad_Storage:'denied',analytics_Storage:permission});
      if(permission==='denied'){
        // Clear previously issued Clarity cookies, if any, on revocation.
        window.clarity('consent',false);
      }
    }
    updateButtons();
  }
  window.rocketPrivacy={getConsent:function(){return permission;},setConsent:setConsent};
  function safeText(input){
    if(typeof input!=='string')return '';
    // Product & selector values only; never forward user-entered messages or form field values.
    return input.slice(0,100).replace(/[^a-zA-Z0-9 \-\|.&]/g,'');
  }
  function track(eventName,params){
    if(!config||!(/^[a-z][a-z0-9_]{0,39}$/).test(eventName))return;
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
    if(!config)return;
    var obj=makeItem(item);
    if(obj)window.gtag('event',eventName,{currency:'USD',value:obj.price*obj.quantity,items:[obj]});
  }
  function cartEvent(eventName,items){
    if(!config||!Array.isArray(items))return;
    var safeItems=items.map(makeItem).filter(Boolean);
    if(safeItems.length)window.gtag('event',eventName,{
      currency:'USD',value:safeItems.reduce(function(sum,item){return sum+item.price*item.quantity;},0),
      items:safeItems
    });
  }
  window.rocketAnalytics={track:track,itemEvent:itemEvent,cartEvent:cartEvent,environment:config?config.env:'disabled'};
  document.querySelectorAll('[data-rp-consent]').forEach(function(button){
    button.addEventListener('click',function(){setConsent(button.getAttribute('data-rp-consent'));});
  });
  updateButtons();
  if(!config)return;
  // Google Consent Mode v2 — all storage denied by default unless the visitor opted in.
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
  window.gtag('consent','default',consentObject(permission));
  window.gtag('set','allow_google_signals',false);
  window.gtag('set','allow_ad_personalization_signals',false);
  window.gtag('js',new Date());
  window.gtag('config',config.ga,{send_page_view:false});
  // Exclude URL search parameters, which may contain Stripe session IDs or other user information.
  window.gtag('event','page_view',{
    page_title:document.title,
    page_location:location.origin+location.pathname,
    page_path:location.pathname
  });
  var google=document.createElement('script');
  google.async=true;
  google.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(config.ga);
  document.head.appendChild(google);
  // Microsoft's recommended queue-style loader and Consent V2 signaling.
  window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments);};
  window.clarity('consentv2',{ad_Storage:'denied',analytics_Storage:permission});
  var clarity=document.createElement('script');
  clarity.async=true;
  clarity.src='https://www.clarity.ms/tag/'+encodeURIComponent(config.clarity);
  document.head.appendChild(clarity);
})();
