/* ===== Formulaires de devis (toutes les pages) =====
   Chaque <form data-devis> est géré ici.
   Anti-spam : champ piège invisible « site_web » + délai minimum de 3 s entre
   l'affichage et l'envoi. Un robot qui remplit le piège ou envoie trop vite
   voit le message de succès, mais rien n'est transmis.
   Envoi : FormSubmit vers l'e-mail de Brian ; repli SMS si l'envoi échoue. */
(function(){
  var LEAD_EMAIL = 'lafleurbrian@icloud.com';
  var SMS_TO = '+33643142297';
  var DELAI_MIN_MS = 3000;
  var ouverture = Date.now();

  function val(form, name){ var el = form.elements[name]; return el ? String(el.value || '').trim() : ''; }

  function succes(form, sms){
    var ok = form.dataset.ok ? document.getElementById(form.dataset.ok) : null;
    if(!ok){
      ok = document.createElement('div');
      ok.className = 'devis-ok';
      ok.setAttribute('role', 'status');
      ok.innerHTML = '<strong></strong><p></p>';
      form.parentNode.insertBefore(ok, form.nextSibling);
    }
    var titre = ok.querySelector('strong, h3, [data-ok-title]');
    var texte = ok.querySelector('p, [data-ok-text]');
    if(titre) titre.textContent = sms ? 'Votre SMS est prêt !' : 'Demande envoyée !';
    if(texte) texte.textContent = sms
      ? 'Appuyez sur « Envoyer » dans votre application de messages pour transmettre votre demande à Brian. Vous préférez appeler ? 06 43 14 22 97.'
      : 'Merci, Brian vous rappelle sous 24h ouvrées. Une urgence ou une fuite ? Appelez le 06 43 14 22 97.';
    form.style.display = 'none';
    ok.style.display = 'block';
  }

  function envoyerSMS(body){ window.location.href = 'sms:' + SMS_TO + '?&body=' + body; }

  function brancher(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(!val(form, 'nom') || !val(form, 'telephone')){ form.reportValidity(); return; }

      // Robot détecté : on simule le succès sans rien envoyer.
      if(val(form, 'site_web') || Date.now() - ouverture < DELAI_MIN_MS){ succes(form, false); return; }

      var lignes = [
        'Demande de devis - Brian Lafleur',
        'Nom : ' + val(form, 'nom'),
        'Tel : ' + val(form, 'telephone'),
        val(form, 'ville') ? 'Ville : ' + val(form, 'ville') : '',
        val(form, 'type_travaux') ? 'Travaux : ' + val(form, 'type_travaux') : '',
        val(form, 'message') ? 'Projet : ' + val(form, 'message') : '',
        'Page : ' + location.pathname
      ].filter(Boolean);
      var body = encodeURIComponent(lignes.join('\n'));

      var btn = form.querySelector('button[type=submit]');
      if(btn){ btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Envoi en cours…'; }

      fetch('https://formsubmit.co/ajax/' + encodeURIComponent(LEAD_EMAIL), {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: JSON.stringify({
          _subject: 'Nouvelle demande de devis · Brian Lafleur',
          _template: 'table',
          _honey: '',
          Nom: val(form, 'nom'), 'Téléphone': val(form, 'telephone'), Ville: val(form, 'ville'),
          'Type de travaux': val(form, 'type_travaux'), Projet: val(form, 'message'), Page: location.pathname
        })
      })
      .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(){ succes(form, false); if(window.blTrack) window.blTrack('generate_lead', {formulaire: 'devis', canal: 'email'}); })
      .catch(function(){ envoyerSMS(body); succes(form, true); if(window.blTrack) window.blTrack('generate_lead', {formulaire: 'devis', canal: 'sms'}); })
      .finally(function(){ if(btn){ btn.disabled = false; btn.textContent = btn.dataset.label || 'Envoyer'; } });
    });
  }

  function init(){ document.querySelectorAll('form[data-devis]').forEach(brancher); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
