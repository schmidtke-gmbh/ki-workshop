(function(){
  'use strict';
  var STORAGE_KEY='schmidtkeFundingResult';
  var campaignKeys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid'];

  function pushEvent(name,data){window.dataLayer=window.dataLayer||[];window.dataLayer.push(Object.assign({event:name,funnel:'content_marketing_foerdercheck'},data||{}));}
  document.querySelectorAll('[data-track]').forEach(function(link){link.addEventListener('click',function(){pushEvent(link.dataset.track,{link_url:link.href});});});

  campaignKeys.forEach(function(key){
    var value=new URLSearchParams(location.search).get(key);
    if(value&&!sessionStorage.getItem(key))sessionStorage.setItem(key,value);
    var field=document.getElementById(key);if(field)field.value=sessionStorage.getItem(key)||'';
  });
  if(!sessionStorage.getItem('landing_page'))sessionStorage.setItem('landing_page',location.href);
  if(!sessionStorage.getItem('original_referrer'))sessionStorage.setItem('original_referrer',document.referrer||'direct');
  var landingField=document.getElementById('landing_page');if(landingField)landingField.value=sessionStorage.getItem('landing_page')||'';
  var referrerField=document.getElementById('referrer');if(referrerField)referrerField.value=sessionStorage.getItem('original_referrer')||'';

  var form=document.getElementById('fundingForm');
  if(form){
    var current=1,total=4;
    var bundesland=document.getElementById('bundesland');
    var regionWrap=document.getElementById('regionField');
    var region=document.getElementById('sonderregion');
    var regionHint=document.getElementById('regionHint');
    var east=['Brandenburg','Mecklenburg-Vorpommern','Sachsen','Sachsen-Anhalt','Thüringen'];

    function allowedRegion(){
      if(bundesland.value==='Niedersachsen')return 'lueneburg';
      if(bundesland.value==='Rheinland-Pfalz')return 'trier';
      if(bundesland.value==='Sachsen')return 'leipzig';
      return '';
    }
    function updateRegion(){
      var allowed=allowedRegion();
      regionWrap.hidden=!allowed;
      region.required=!!allowed;
      Array.from(region.options).forEach(function(option){option.hidden=!!option.value&&!['',allowed,'nein'].includes(option.value);});
      if(!allowed)region.value='';
      if(allowed==='lueneburg')regionHint.textContent='Region Lüneburg: Bitte prüfe die regionale Zuordnung deines Unternehmenssitzes.';
      if(allowed==='trier')regionHint.textContent='Region Trier: Bitte prüfe die regionale Zuordnung deines Unternehmenssitzes.';
      if(allowed==='leipzig')regionHint.textContent='Zur Region Leipzig zählen Stadt Leipzig, Landkreis Leipzig und Nordsachsen.';
    }
    bundesland.addEventListener('change',updateRegion);updateRegion();

    function fieldsInStep(step){return Array.from(form.querySelector('[data-step="'+step+'"]').querySelectorAll('input,select,textarea')).filter(function(el){return el.type!=='hidden'&&!el.disabled;});}
    function fieldGroup(el){return el.closest('.field')||el.closest('.consent');}
    function validStep(step){
      var valid=true,seenNames={};
      fieldsInStep(step).forEach(function(el){
        var group=fieldGroup(el);if(!group)return;
        if(el.type==='radio'){
          if(seenNames[el.name])return;seenNames[el.name]=true;
          var checked=form.querySelector('input[name="'+el.name+'"]:checked');
          group.classList.toggle('is-invalid',el.required&&!checked);if(el.required&&!checked)valid=false;
        }else if(el.type==='checkbox'){
          group.classList.toggle('is-invalid',el.required&&!el.checked);if(el.required&&!el.checked)valid=false;
        }else{
          var ok=el.checkValidity();
          if(el.id==='plz')ok=/^\d{5}$/.test(el.value);
          if(el.id==='telefon')ok=el.value.replace(/\D/g,'').length>=7;
          group.classList.toggle('is-invalid',!ok);if(!ok)valid=false;
        }
      });
      var first=form.querySelector('[data-step="'+step+'"] .is-invalid input, [data-step="'+step+'"] .is-invalid select');if(first)first.focus();
      return valid;
    }
    function showStep(step){
      form.querySelectorAll('.form-step').forEach(function(panel){var active=Number(panel.dataset.step)===step;panel.hidden=!active;panel.classList.toggle('is-active',active);});
      current=step;var percent=Math.round(step/total*100);
      document.getElementById('progressText').textContent='Schritt '+step+' von '+total;
      document.getElementById('progressPercent').textContent=percent+' %';document.getElementById('progressBar').style.width=percent+'%';
      document.querySelector('.progress').scrollIntoView({block:'start'});pushEvent('funnel_step',{step:step});
      var heading=form.querySelector('[data-step="'+step+'"] h1');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}
    }
    form.querySelectorAll('[data-next]').forEach(function(button){button.addEventListener('click',function(){if(!validStep(current))return;if(current===3)calculate();showStep(current+1);});});
    form.querySelectorAll('[data-back]').forEach(function(button){button.addEventListener('click',function(){showStep(current-1);});});
    form.addEventListener('input',function(event){var group=fieldGroup(event.target);if(group)group.classList.remove('is-invalid');});
    pushEvent('funnel_start');

    function rateForLocation(){
      var state=bundesland.value,special=region.value;
      if(special==='lueneburg'||special==='trier')return .8;
      if(special==='leipzig')return .5;
      return east.includes(state)?.8:.5;
    }
    function leadClass(){
      var score=0;
      var employees=(form.elements.mitarbeiter.value||'');if(employees!=='0-1')score+=2;
      if(form.elements.angebot_validiert.value==='ja')score+=3;
      if(['1500-3000','3000-5000','5000+'].includes(form.elements.marketingbudget.value))score+=2;
      if(['sofort','1-3'].includes(form.elements.startzeitraum.value))score+=2;
      return score>=7?'A – passend':score>=4?'B – prüfen':'C – kein aktiver Vertriebsanruf';
    }
    function calculate(){
      var costs=Math.max(0,Number(form.elements.beratungskosten.value)||0),basis=Math.min(costs,3500),rate=rateForLocation(),grant=Math.round(basis*rate*100)/100,own=Math.max(0,costs-grant),classification=leadClass();
      var result={rate:rate,grant:grant,own:own,costs:costs,basis:basis,state:bundesland.value,region:region.value||'keine Sonderregion',classification:classification,firstName:form.elements.vorname?form.elements.vorname.value:''};
      document.getElementById('foerderquote').value=Math.round(rate*100)+' %';document.getElementById('foerderbetrag').value=grant.toFixed(2);document.getElementById('eigenanteil').value=own.toFixed(2);document.getElementById('lead_klasse').value=classification;
      var locked=document.getElementById('lockedAmount');if(locked)locked.textContent=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(grant);
      return result;
    }
    form.addEventListener('submit',async function(event){
      event.preventDefault();if(!validStep(4))return;
      var result=calculate();result.firstName=form.elements.vorname.value;sessionStorage.setItem(STORAGE_KEY,JSON.stringify(result));
      var button=document.getElementById('submitButton'),error=document.getElementById('submitError');button.disabled=true;button.textContent='Wird berechnet …';error.hidden=true;
      try{
        if(location.protocol!=='file:'){
          var response=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(new FormData(form)).toString()});
          if(!response.ok)throw new Error('HTTP '+response.status);
        }
        pushEvent('lead_submitted',{lead_class:result.classification,rate:Math.round(result.rate*100)});location.href='bafa-ergebnis.html';
      }catch(err){button.disabled=false;button.textContent='Ergebnis jetzt anzeigen';error.hidden=false;pushEvent('lead_error',{message:String(err)});}
    });
  }

  var resultRate=document.getElementById('resultRate');
  if(resultRate){
    var data;try{data=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'null');}catch(ignore){data=null;}
    if(!data){document.getElementById('resultBasis').textContent='Es liegt keine lokale Berechnung vor. Bitte starte den Fördercheck erneut.';document.querySelector('.result-summary').hidden=true;}
    else{
      var euro=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
      document.getElementById('resultName').textContent=data.firstName||'Vielen Dank';resultRate.textContent=Math.round(data.rate*100)+' %';document.getElementById('resultGrant').textContent=euro.format(data.grant);document.getElementById('resultOwn').textContent=euro.format(data.own);document.getElementById('resultBasis').textContent='Berechnet aus '+euro.format(data.costs)+' geplanten Nettoberatungskosten; förderfähige Bemessungsgrundlage in dieser Modellrechnung: maximal '+euro.format(data.basis)+'.';
      var message=document.getElementById('fitMessage');
      if(data.classification.indexOf('C')===0)message.innerHTML='<h2>Deine Berechnung steht – aktuell empfehlen wir noch keinen Beratungstermin.</h2><p>Der Zuschuss allein macht ein Marketingvorhaben nicht wirtschaftlich. Stabilisiere zuerst Angebot, Nachfrage oder Umsetzungsbudget. Deine Beispielrechnung bleibt davon unberührt.</p>';
      else if(data.classification.indexOf('A')===0)message.innerHTML='<h2>Deine Ausgangslage wirkt grundsätzlich passend.</h2><p>Wir prüfen deine Angaben persönlich und melden uns, um Beratungsziel, Voraussetzungen und sinnvolle nächste Schritte zu klären.</p>';
      pushEvent('lead_thankyou',{lead_class:data.classification,rate:Math.round(data.rate*100)});
    }
  }
})();
