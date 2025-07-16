// common.js

// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Globālie mainīgie Firebase instancēm un lietotāja ID
window.app = null;
window.db = null;
window.auth = null;
window.userId = null;
window.isAuthReady = false; // Karogs, kas norāda, vai autentifikācijas statuss ir atrisināts

// Funkcija, kas atjaunina navigācijas pogas, pamatojoties uz lietotāja statusu
function updateNavigationForAuth(user) {
    const loginNavItem = document.getElementById('login-nav-item');
    const registerNavItem = document.getElementById('register-nav-item');
    const userMenuButton = document.getElementById('user-menu-button');
    const logoutButtonDropdown = document.getElementById('logout-button-dropdown');

    if (user) {
        // Lietotājs ir pieteicies
        if (loginNavItem) loginNavItem.classList.add('hidden');
        if (registerNavItem) registerNavItem.classList.add('hidden');
        if (userMenuButton) userMenuButton.classList.remove('hidden'); // Pārliecināties, ka lietotāja poga ir redzama
        if (logoutButtonDropdown) {
            logoutButtonDropdown.classList.remove('hidden');
            logoutButtonDropdown.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await signOut(window.auth);
                    console.log("Lietotājs veiksmīgi izrakstījies.");
                    // Navigācija tiks atjaunināta, pateicoties onAuthStateChanged
                    window.location.href = 'index.html'; // Pēc izrakstīšanās novirzīt uz sākumlapu
                } catch (error) {
                    console.error("Kļūda izrakstoties:", error);
                }
            });
        }
    } else {
        // Lietotājs nav pieteicies
        if (loginNavItem) loginNavItem.classList.remove('hidden');
        if (registerNavItem) registerNavItem.classList.remove('hidden');
        if (userMenuButton) userMenuButton.classList.remove('hidden'); // Lietotāja poga vienmēr redzama, bet nolaižamā izvēlne varētu būt tukša vai ar citām opcijām
        if (logoutButtonDropdown) logoutButtonDropdown.classList.add('hidden');
    }
}


// Kad DOM ir ielādēts, inicializēt Firebase un iestatīt kopīgo funkcionalitāti
document.addEventListener('DOMContentLoaded', async () => {
    console.log("common.js: DOMContentLoaded event fired.");

    try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

        if (Object.keys(firebaseConfig).length === 0) {
            console.error("common.js: Firebase konfigurācija trūkst. Lūdzu, nodrošiniet __firebase_config.");
            return;
        }

        // Inicializēt Firebase lietotni un pakalpojumus
        window.app = initializeApp(firebaseConfig);
        window.db = getFirestore(window.app);
        window.auth = getAuth(window.app);
        console.log("common.js: Firebase initialized.");

        // Mobilo izvēlņu pārslēgšanas poga
        const mobileMenuButton = document.getElementById('mobile-menu-button') ||
                                 document.getElementById('mobile-menu-button-detail') ||
                                 document.getElementById('mobile-menu-button-archive') ||
                                 document.getElementById('mobile-menu-button-forum');

        const mainNav = document.getElementById('main-nav') ||
                        document.getElementById('main-nav-detail') ||
                        document.getElementById('main-nav-archive') ||
                        document.getElementById('main-nav-forum');

        console.log("common.js: Mobile menu button found:", !!mobileMenuButton);
        console.log("common.js: Main navigation found:", !!mainNav);

        if (mobileMenuButton && mainNav) {
            mobileMenuButton.addEventListener('click', function() {
                mainNav.classList.toggle('hidden');
                mainNav.classList.toggle('flex');
                mainNav.classList.toggle('flex-col');
                console.log("common.js: Mobile menu toggled. Hidden state:", mainNav.classList.contains('hidden'));
            });

            mainNav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth < 768) {
                        mainNav.classList.add('hidden');
                        mainNav.classList.remove('flex');
                        mainNav.classList.remove('flex-col');
                    }
                });
            });

            window.addEventListener('resize', () => {
                if (window.innerWidth >= 768) {
                    mainNav.classList.remove('hidden');
                    mainNav.classList.add('flex');
                    mainNav.classList.remove('flex-col');
                } else {
                    mainNav.classList.add('hidden');
                    mainNav.classList.remove('flex');
                    mainNav.classList.remove('flex-col');
                }
            });
        } else {
            console.warn("common.js: Mobilo izvēlņu elementi netika atrasti DOMContentLoaded laikā.");
        }

        // Lietotāja profila nolaižamā izvēlne
        const userMenuButton = document.getElementById('user-menu-button') ||
                               document.getElementById('user-menu-button-detail') ||
                               document.getElementById('user-menu-button-archive') ||
                               document.getElementById('user-menu-button-forum');

        const userMenuDropdown = document.getElementById('user-menu-dropdown') ||
                                 document.getElementById('user-menu-dropdown-detail') ||
                                 document.getElementById('user-menu-dropdown-archive') ||
                                 document.getElementById('user-menu-dropdown-forum');

        console.log("common.js: User menu button found (generalized):", !!userMenuButton, userMenuButton);
        console.log("common.js: User menu dropdown found (generalized):", !!userMenuDropdown, userMenuDropdown);

        if (userMenuButton && userMenuDropdown) {
            userMenuButton.addEventListener('click', function(event) {
                event.stopPropagation(); // Novērst dokumenta klikšķa notikumu tūlītēju iedarbināšanu
                userMenuDropdown.classList.toggle('hidden');
                console.log("common.js: User menu dropdown toggled. Hidden state:", userMenuDropdown.classList.contains('hidden'));
            });

            document.addEventListener('click', function(event) {
                if (!userMenuButton.contains(event.target) && !userMenuDropdown.contains(event.target)) {
                    userMenuDropdown.classList.add('hidden');
                    console.log("common.js: Click outside, user menu dropdown hidden.");
                }
            });
        } else {
            console.warn("common.js: Lietotāja izvēlņu elementi netika atrasti DOMContentLoaded laikā (vispārināts).");
        }

        // Klausīties autentifikācijas statusa izmaiņas
        onAuthStateChanged(window.auth, async (user) => {
            if (user) {
                window.userId = user.uid;
                console.log("common.js: Autentificēts ar Firebase UID:", window.userId);
                updateNavigationForAuth(user); // Atjaunināt navigāciju, kad lietotājs ir pieteicies
            } else {
                // Mēģināt pieteikties anonīmi, ja nav lietotāja
                try {
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        await signInWithCustomToken(window.auth, __initial_auth_token);
                        window.userId = window.auth.currentUser.uid;
                        console.log("common.js: Pieteicies ar pielāgotu tokenu. UID:", window.userId);
                    } else {
                        await signInAnonymously(window.auth);
                        window.userId = window.auth.currentUser.uid;
                        console.log("common.js: Pieteicies anonīmi. UID:", window.userId);
                    }
                    updateNavigationForAuth(window.auth.currentUser); // Atjaunināt navigāciju pēc anonīmās pieteikšanās
                } catch (error) {
                    console.error("common.js: Firebase autentifikācijas kļūda:", error);
                    updateNavigationForAuth(null); // Ja autentifikācija neizdodas, parādīt nepieteikušā lietotāja navigāciju
                }
            }
            window.isAuthReady = true; // Autentifikācijas statuss ir atrisināts
            console.log("common.js: Auth state resolved. isAuthReady:", window.isAuthReady);

            // Izsaukt lapas specifisko inicializācijas funkciju, ja tāda pastāv
            if (typeof window.initializePageContent === 'function') {
                console.log("common.js: Calling initializePageContent for current page.");
                window.initializePageContent();
            }
        });

    } catch (error) {
        console.error("common.js: Neizdevās inicializēt Firebase:", error);
    }
});
