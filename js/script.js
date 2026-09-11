/* =========================================
   SOVELY LANDING PAGE JAVASCRIPT
========================================= */


/* =========================================
   MOBILE MENU
========================================= */

const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");

menuToggle?.addEventListener("click", () => {

  const isOpen = mobileMenu.classList.toggle("open");

  menuToggle.setAttribute(
    "aria-expanded",
    String(isOpen)
  );

});


document.querySelectorAll(".mobile-menu a").forEach(link => {

  link.addEventListener("click", () => {

    mobileMenu.classList.remove("open");

    menuToggle?.setAttribute(
      "aria-expanded",
      "false"
    );

  });

});


/* =========================================
   SCROLL ANIMATIONS
========================================= */

const revealItems =
  document.querySelectorAll(".reveal");


const observer = new IntersectionObserver(
  (entries, obs) => {

    entries.forEach(entry => {

      if (entry.isIntersecting) {

        entry.target.classList.add("visible");

        obs.unobserve(entry.target);

      }

    });

  },
  {
    threshold: 0.12
  }
);


revealItems.forEach(element => {

  observer.observe(element);

});


/* =========================================
   LEAD FORM POPUP
========================================= */

const leadModal =
  document.getElementById("leadModal");

const popupLeadForm =
  document.getElementById("popupLeadForm");


/* =========================================
   THANK YOU POPUP
========================================= */

const thankModal =
  document.getElementById("thankModal");

const closeThankModal =
  document.getElementById("closeThankModal");

const closeThankModalBottom =
  document.getElementById(
    "closeThankModalBottom"
  );


/* =========================================
   OPEN LEAD FORM
========================================= */

function openLeadModal() {

  if (!leadModal) return;

  leadModal.classList.add("show");

  leadModal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow = "hidden";

}


/* =========================================
   OPEN THANK YOU
========================================= */

function openThankModal() {

  if (!thankModal) return;

  thankModal.classList.add("show");

  thankModal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow = "hidden";

}


/* =========================================
   CLOSE THANK YOU
========================================= */

function closeThankYouModal() {

  if (!thankModal) return;

  thankModal.classList.remove("show");

  thankModal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow = "";

}


/* =========================================
   PAGE LOAD
========================================= */

window.addEventListener("load", () => {

  const params =
    new URLSearchParams(
      window.location.search
    );


  /*

    Salesforce redirects to:

    https://sovely.in/?lead=success

  */


  if (
    params.get("lead") === "success"
  ) {

    /*
      Do NOT show form again.
    */

    openThankModal();


    /*
      Remove ?lead=success
      from browser URL.
    */

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );


  } else {

    /*
      Open form automatically
      when visitor enters page.
    */

    setTimeout(() => {

      openLeadModal();

    }, 700);

  }

});


/* =========================================
   THANK YOU CLOSE BUTTON
========================================= */

closeThankModal?.addEventListener(
  "click",
  closeThankYouModal
);


closeThankModalBottom?.addEventListener(
  "click",
  closeThankYouModal
);


/* =========================================
   IMPORTANT:

   DO NOT ADD:

   leadModal.addEventListener("click"...)

   DO NOT ADD ESC CLOSE FOR LEAD POPUP.

   The first popup cannot be closed.
========================================= */


/* =========================================
   THANK YOU POPUP BACKDROP

   This can close the THANK YOU popup.
========================================= */

document
  .querySelector(".thank-modal-backdrop")
  ?.addEventListener(
    "click",
    closeThankYouModal
  );


/* =========================================
   ESC ONLY CLOSES THANK YOU POPUP
========================================= */

document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape" &&
      thankModal?.classList.contains("show")
    ) {

      closeThankYouModal();

    }

  }
);


/* =========================================
   BUTTONS THAT OPEN POPUP
========================================= */

document
  .querySelectorAll(".open-lead-form")
  .forEach(button => {

    button.addEventListener(
      "click",
      event => {

        event.preventDefault();

        openLeadModal();

      }
    );

  });


/* =========================================
   POPUP FORM VALIDATION
========================================= */

popupLeadForm?.addEventListener(
  "submit",
  function(event) {

    /*
      We DON'T prevent the submission.

      Browser checks required fields first.
    */

    if (!popupLeadForm.checkValidity()) {

      event.preventDefault();

      popupLeadForm.reportValidity();

      return;

    }

    /*
      If valid:

      Salesforce receives the form.

      Salesforce redirects to:

      https://sovely.in/?lead=success

    */

  }
);


/* =========================================
   GET STARTED FORM VALIDATION
========================================= */

const mainLeadForm =
  document.getElementById(
    "leadCaptureForm"
  );


mainLeadForm?.addEventListener(
  "submit",
  function(event) {

    if (!mainLeadForm.checkValidity()) {

      event.preventDefault();

      mainLeadForm.reportValidity();

    }

    /*
      If valid:
      allow Salesforce submission.
    */

  }
);
// const WHATSAPP_NUMBER = "919353215891";
// // Add your real form endpoint here when your backend/Google Apps Script/webhook is ready.
// // Example: "https://your-domain.com/api/leads"
// const FORM_ENDPOINT = "";

// const menuToggle = document.querySelector(".menu-toggle");
// const mobileMenu = document.querySelector(".mobile-menu");

// menuToggle?.addEventListener("click", () => {
//   const open = mobileMenu.classList.toggle("open");
//   menuToggle.setAttribute("aria-expanded", String(open));
// });

// document.querySelectorAll(".mobile-menu a").forEach(link => {
//   link.addEventListener("click", () => {
//     mobileMenu.classList.remove("open");
//     menuToggle?.setAttribute("aria-expanded", "false");
//   });
// });

// const revealItems = document.querySelectorAll(".reveal");
// const observer = new IntersectionObserver((entries, obs) => {
//   entries.forEach(entry => {
//     if (entry.isIntersecting) {
//       entry.target.classList.add("visible");
//       obs.unobserve(entry.target);
//     }
//   });
// }, { threshold: 0.12 });
// revealItems.forEach(el => observer.observe(el));

// const form = document.getElementById("leadCaptureForm");
// const modal = document.getElementById("thankYouModal");
// const errorBox = document.getElementById("formError");
// const modalWhatsapp = document.getElementById("modalWhatsapp");

// function openModal(formData) {
//   const name = formData.get("name") || "there";
//   const message = `Hi Sovely, I just submitted the getting-started form. My name is ${name}.`;
//   modalWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
//   modal.classList.add("show");
//   modal.setAttribute("aria-hidden", "false");
//   document.body.style.overflow = "hidden";
// }

// function closeModal() {
//   modal.classList.remove("show");
//   modal.setAttribute("aria-hidden", "true");
//   document.body.style.overflow = "";
// }

// document.querySelectorAll("[data-close-modal]").forEach(el => el.addEventListener("click", closeModal));
// document.addEventListener("keydown", e => {
//   if (e.key === "Escape") closeModal();
// });

// function validPhone(phone) {
//   return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""));
// }

// form?.addEventListener("submit", async (event) => {
//   event.preventDefault();
//   errorBox.textContent = "";

//   if (!form.checkValidity()) {
//     form.reportValidity();
//     return;
//   }

//   const data = new FormData(form);
//   const phone = String(data.get("phone") || "").replace(/\D/g, "");
//   if (!validPhone(phone)) {
//     errorBox.textContent = "Please enter a valid 10-digit Indian mobile number.";
//     return;
//   }

//   const submitButton = form.querySelector(".form-submit");
//   submitButton.disabled = true;
//   submitButton.innerHTML = "Submitting…";

//   try {
//     if (FORM_ENDPOINT) {
//       const response = await fetch(FORM_ENDPOINT, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(Object.fromEntries(data.entries()))
//       });
//       if (!response.ok) throw new Error("Submission failed");
//     } else {
//       // Demo mode: UI works immediately. Connect FORM_ENDPOINT for real lead storage.
//       await new Promise(resolve => setTimeout(resolve, 650));
//       console.info("Sovely lead (demo mode):", Object.fromEntries(data.entries()));
//     }

//     form.reset();
//     openModal(data);
//   } catch (error) {
//     console.error(error);
//     errorBox.textContent = "We couldn't submit your details right now. Please try again or contact us on WhatsApp.";
//   } finally {
//     submitButton.disabled = false;
//     submitButton.innerHTML = "Submit & Get Started <span>→</span>";
//   }
// });
