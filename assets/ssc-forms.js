/* Seven Sisters Conservatoire — shared submit handler for enquiry forms.
   Posts to the Google Apps Script web app (see enquiries-apps-script.js in the repo root),
   which writes each form to its own tab in the "Enquiries 2027" Google Sheet. */
(function () {
  // Paste the Apps Script Web app URL (ending in /exec) here after deploying it.
  var ENDPOINT = '';

  var UNDER_18 = ['Under 10', '10–12', '13–15', '16–17'];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

  // Lessons form: show and require the parent/guardian block when the learner is under 18
  // or the person filling it in is a parent/guardian.
  function wireGuardian(form) {
    var block = $('[data-guardian]', form);
    if (!block) return;
    function update() {
      var who = ((($('input[name="respondent"]:checked', form) || {}).value) || '').toLowerCase();
      var age = ($('select[name="learner_age_band"]', form) || {}).value || '';
      var minor = UNDER_18.indexOf(age) !== -1;
      var show = minor || who.indexOf('parent') !== -1;
      block.hidden = !show;
      $all('[data-guardian-req]', block).forEach(function (el) { el.required = show; });
    }
    form.addEventListener('change', update);
    update();
  }

  function checkGroups(form) {
    // At least one box ticked in each [data-need-one] group.
    var bad = null;
    $all('[data-need-one]', form).forEach(function (g) {
      if (!bad && !$('input:checked', g)) bad = g;
    });
    return bad;
  }

  function validateLessons(form) {
    var who = ((($('input[name="respondent"]:checked', form) || {}).value) || '').toLowerCase();
    var age = ($('select[name="learner_age_band"]', form) || {}).value || '';
    if (form.dataset.sscForm === 'lessons' && UNDER_18.indexOf(age) !== -1 && who.indexOf('learner') !== -1) {
      return 'Learners under 18 need a parent or guardian to complete this form. Please choose "I am a parent or guardian".';
    }
    return '';
  }

  $all('form[data-ssc-form]').forEach(function (form) {
    wireGuardian(form);
    var err = $('.form-error', form);
    var btn = $('button[type="submit"]', form);
    var success = document.getElementById(form.dataset.success);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      err.hidden = true;

      if (!form.checkValidity()) { form.reportValidity(); return; }
      var group = checkGroups(form);
      if (group) {
        err.textContent = 'Please choose at least one option under "' + group.dataset.needOne + '".';
        err.hidden = false; group.scrollIntoView({ block: 'center', behavior: 'smooth' }); return;
      }
      var msg = validateLessons(form);
      if (msg) { err.textContent = msg; err.hidden = false; return; }

      if (!ENDPOINT) {
        err.textContent = 'This form is not connected yet. Please email hello@sevensistersconservatoire.org in the meantime.';
        err.hidden = false; return;
      }

      var data = new URLSearchParams();
      data.append('form', form.dataset.sscForm);
      data.append('page', location.pathname);
      new FormData(form).forEach(function (v, k) { data.append(k, v); });

      btn.disabled = true; btn.textContent = 'Sending…';
      fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', body: data })
        .then(function () {
          form.hidden = true;
          if (success) { success.hidden = false; success.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = 'Send';
          err.textContent = 'Sorry, something went wrong. Please try again, or email hello@sevensistersconservatoire.org.';
          err.hidden = false;
        });
    });
  });
})();
