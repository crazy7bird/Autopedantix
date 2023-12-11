// ==UserScript==
// @name         AutoPédantix 2
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://cemantix.certitudes.org/pedantix
// @icon         https://www.google.com/s2/favicons?sz=64&domain=certitudes.org
// @grant        GM.xmlHttpRequest
// @run-at       document-end
// ==/UserScript==


(function() {
    'use strict';

    //======================================== Variables Allll ================

    let autoP2 = {
        testedWords : [], //List of word put in wordToTest.
        synoAsked : [], // List of word used for syno generator.
        lenMap : [], //List of len.
        heatMapWords : [], // List of words by positions.
        heatMapHeats : [], // List of Heat with heatMapWords, 100 the heatMapWord is correct, less it’s a synonyme.
        wordToTest : [], // Word to test throught API pedantix.
        wordToPut : [], // Actual 100 Heat words to put in the page ^^.
        managerInputWord :[], // Manager select words to test by priority
        words_wiki :[], // Added due to diff between real sentences vs what need for wiki seach
        sentences_wiki : [], // Already tested sentences.
        stop : false, // Tells every part of the prog that the pedantix hasbenn found.
        start_t : 0, // Stats
        stop_t : 0, // Stats

    }

    const wordPerSec = 100;

    autoP2.wordToTest = [
        // common.
        "le", "un", "de", "qu","c","s","il","on",
        "n", "pas", "non",
        "mais", "où", "ou", "et", "donc", "or", "ni", "car","à",
        "pour","quand","puis",
        "que","comme","lorsque","puisque","quand","quoique","si","quoi",
        "avec", "sans","cependant","aussi","toutefois","enfin",
        "est","sont",
        "avoir","être","pouvoir",
        "nord","est","ouest","sud",
        "fin","début","millieu","avant","après","lors",
        //Wikipedia theme.
        "Arts","Architecture","Artisanat","Dessin","Cinéma","Design",
        "Littérature","Musique","Photographie","Sculpture","spectacle","Artiste",
        "Histoire","Institution","Œuvre","Technique","artistique",
        "Société","Alimentation","Croyance","Culture","Divertissement","Droit","Éducation","Idéologie",
        "Langue","Médias","Mode","Organisation","Groupe","social","Politique","Santé",
        "Sexualité","Sport","Tourisme","Travail","Urbanisme","Sciences","Astronomie","Biologie",
        "Chimie","Mathématiques","Physique","Terre","Anthropologie","Archéologie",
        "Économie","Géographie","Histoire","Linguistique","Information","Philosophie","Psychologie",
        "Sociologie","Technologies","Aéronautique","Agriculture","Astronautique","Électricité",
        "Électronique","Énergie","Industrie","Ingénierie","Informatique","Mécanique","Médecine",
        "Métallurgie","Plasturgie","Robotique","Sylviculture","Télécommunications","Transports",
        "Espace","Temps","Chronologie","Date","Calendrier","Siècle","Année","Événement","Lieu",
        "Territoire","Ville","Continent","Pays","Personnalité","Personne","Personnage","période",
        "métier","secteur","activité","nationalité"
    ];

    //======================================== HMI =========================================
    async function do_when_page_is_loaded(){
          // Remove anoying pop-up first time.
          while(document.getElementById("pedantix-rules").style.display.length === 0) await sleep(10);
          document.getElementById("pedantix-rules").style.display = "none";
          document.body.className ="";
          // test if already found.
          while(document.getElementById("pedantix-success").style.opacity.length === 0)await sleep(10); //Line for the start up.
          test_finish();
         // just sign the page with the plugin.
         // document.getElementById("pedantix-guess").value = "AutoPedentix 2";
    }
    do_when_page_is_loaded();
    document.getElementById("pedantix-guess").value = "AutoPedentix 2";

    function onKeydown(evt) {
        // Use https://keycode.info/ to get keys
        if (evt.keyCode == 112) { //F1
           autoPedantix_start();
        }
        if (evt.keyCode == 113) { //F2
            reset();
        }
        if (evt.keyCode == 114) { //F3
            test();
        }
        if (evt.keyCode == 115) { //F4
            // advance();
            try_autoreload();
        }
    }
    document.addEventListener('keydown', onKeydown, true);

    //========================================= Fun =========================================

    // convert html accent and spécial char.
    function decodeHTMLEntities(text) {
        var textArea = document.createElement('textarea');
        textArea.innerHTML = text;
        let ret = textArea.value;
        textArea.remove();
        return ret;
    }

    /* test if an object is empty*/
    function isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function test_finish(){
        if(document.getElementById("pedantix-success").style.opacity == 1){
            autoP2.stop = true;
            autoP2.stop_t = Date.now();
            console.log("=== Auto finish ===");
            advance();
        }
    }


    function get_all_len(){
        // word len équal number of &nbsp; (space char) minus 2.
        for(let el of document.getElementsByClassName("w")){
            autoP2.lenMap.push((el.innerHTML.match(/&nbsp;/g) || []).length - 2);
        }
    }

    async function autoPedantix_start(){ //Run automatic.
        console.clear();
        console.log("autoPedantix started");
        if(autoP2.stop)return; // already found.
        autoP2.start_t = Date.now();
        get_all_len();
        launch_manage();
        launch_feed_testPedantix();
        launch_syno();
        //  number_brute();
        launch_wiki();
        autoPlay();
    }
    console.log(localStorage.getItem("autoStart"));
    if(localStorage.getItem("autoStart") == "true"){
        localStorage.removeItem("autoStart");
        autoPedantix_start();
    }

    // =================================== clear function ===================================
    async function reset(autostart = false){

        localStorage.clear();

        if(autostart)localStorage.setItem("autoStart",JSON.stringify(true));
        autoP2 = null; // Garbage collector will takout RAM used by this monster
        location.reload();
    }

    //======================================== Game Player ==================================

    function add_wordToPut(word){
        autoP2.wordToPut.push(word);
    }

    //Only release title.
    async function autoPlay(){
        let x =0;
        while(!autoP2.stop){
            while(autoP2.heatMapHeats[x] != 100) await sleep(100);
            await playAutopedantix(autoP2.heatMapWords[x]);
            x++;
        }
    }

    async function playAutopedantix(word){
        // test if page get it.
        let b_done = false;
        // Load the word
        while(document.getElementById("pedantix-guess").value != word) document.getElementById("pedantix-guess").value = word;
        while( !b_done && !autoP2.stop){
            // DOM modification.
            document.getElementById("pedantix-guess-btn").click();
            // Test if appear in localStorage, means it’s tested.
            let local_tested_updated = JSON.parse(localStorage.getItem("p/guesses"));
            // test if already tested and save in localStorage.
            if(local_tested_updated){
                local_tested_updated = Object.keys(local_tested_updated);
                b_done = local_tested_updated.includes(word);
            }
            if(!b_done){
                await sleep(50);
            }
        }
        test_finish(); // is it the last ?
    }

    //======================================== Ask with API PedanTix ========================
    async function paralal_resp_callback(resp){
        let res = JSON.parse(resp);
        let keys =Object.keys(res.score);
        let to_test = false;
        for(let heat of keys){

            // Case never guesed this one
            if(autoP2.heatMapWords[heat] === undefined){
                autoP2.heatMapWords[heat] = res.word;
                autoP2.heatMapHeats[heat] = res.score[heat];
                if(typeof(autoP2.heatMapHeats[heat]) === 'string'){
                    autoP2.heatMapHeats[heat] = 100;
                    autoP2.words_wiki[heat] = res.score[heat];
                    to_test = true;
                }
                continue;
            }

            // Case already found
            if(typeof(autoP2.heatMapHeats[heat]) === 100){
                continue;
            }

            // Case already a guess, compare to new.
            if(typeof(res.score[heat]) === 'string'){
               autoP2.heatMapWords[heat] = res.score[heat];
                autoP2.words_wiki[heat] = res.score[heat];
               autoP2.heatMapHeats[heat] = 100;
               to_test = true;
                continue;
               }
            if( autoP2.heatMapHeats[heat] < res.score[heat]){
                autoP2.heatMapWords[heat] = res.word;
                autoP2.heatMapHeats[heat] = res.score[heat];
            }
        }
        if(to_test) add_wordToPut(res.word);
    }

        async function testPedantix(word){
                    await new Promise((resolve, reject) => {
                GM.xmlHttpRequest({
                    method: "POST",
                    mode:"cors",
                    data:'{"word":"'+word+'","answer":["'+word+'","'+word+'"]}',
                    headers: {
                        "Host": "cemantix.certitudes.org",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
                        "Accept": "*/*",
                        "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
                        "Content-Type": "application/json",
                        "Referer": "https://cemantix.certitudes.org/pedantix",
                        "Origin": "https://cemantix.certitudes.org",
                        "DNT": "1",
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-origin",
                        "Sec-GPC": "1",
                        "Connection": "keep-alive"
                    },
                    credentials: "omit",
                    url: "https://cemantix.certitudes.org/pedantix/score",
                    onload: function(response) {
                               if(response.status !== 200){
                                   console.log("XML Pedantix - ERRROR");
                                   // Reput word in top priority.
                                   autoP2.wordToTest.push(word);
                                   reject();
                                   return;
                               }
                                autoP2.testedWords.push(word);
                                paralal_resp_callback(response.responseText);
                                resolve(response.responseText);
                    }
                });
            });
    }

    // =================================== basicManager ===================================
    const min_prio = 10; // Zero max prio 9 less prio.
    const max_prio = 0; //Used for Google Wiki reshearch.
    const base_prio = 1;
    const num_prio = 2;
    const letter_prio = 3;

    // from 4 to 9 syno prio.
    for(let i = 0 ; i < min_prio; i++)autoP2.managerInputWord[i]=[];

    function add_to_dico(dico,prio){
        autoP2.managerInputWord[prio] = autoP2.managerInputWord[prio].concat(dico);
    }

    function launch_manage(){
        setTimeout(manage, 100);
    }

    async function manage(){
        let b_job_doing = true;
        while(b_job_doing && !autoP2.stop){
            for(let y = min_prio; y >= 0; y-- ){ //Decremented priority wont be resend.
                for(let i = 0; i < y ; i++){
                    if(autoP2.managerInputWord[i].length){
                        autoP2.wordToTest.push((autoP2.managerInputWord[i].pop()));
                    }
                }
            }
            b_job_doing = false;
            for(let z = 0; z < min_prio; z++) b_job_doing |= autoP2.managerInputWord[z].length;
        }
        if(!autoP2.stop) launch_manage();
    }

   function launch_feed_testPedantix(){
       setTimeout(feed_testPedantix,100);
   }

   async function feed_testPedantix(){
       let cooldown =0;
       while(autoP2.wordToTest.length){
           testPedantix(autoP2.wordToTest.pop());
           cooldown++;
           if (cooldown >= wordPerSec){
               await sleep(1000);
               cooldown = 0;
           }
       }
       if(!autoP2.stop)launch_feed_testPedantix();
   }

    // =================================== Synonymes ===================================

    async function multiple_source_syn(txt){
        /* sources url + regex */
        const syno_sources = [["https://synonyms.reverso.net/synonyme/fr/", "<a.*?class=\"synonym.*?>(.*)<\/a>"],
                              ["https://crisco4.unicaen.fr/des/synonymes/",'<a href\=\"\/des\/synonymes\/([^"]*)'],
                              ["https://www.rimessolides.com/motscles.aspx?m=", '<div class="motcle"><a class="l-black".*?>([^<]*)']
                             ];

        /* Clear already made guesses*/
        if(autoP2.synoAsked.includes(txt)) return [];
        else autoP2.synoAsked.push(txt);
        /* actual test */
        let ret = [];
        for(let el of syno_sources){
            let syno = await syno_finder(txt,el[0], el[1]);
            syno = syno.map((word) => word.toLowerCase());
            syno.map((word) => {
                // some site return word with +
                if(word.includes('+')){
                    syno.concat(word.split("+"))
                }
                // other site return multiple word.
                if(word.includes(' ')){
                    syno.concat(word.split(" "));
                }
            });
            // Remove not compatibles.
            syno = syno.filter((word)=>(!word.includes('+') && !word.includes('\'') && !word.includes(' ')));

            // syno = syno.filter( (word) => (!autoP2.testedWords.includes(word)) );
            ret = ret.concat(syno);
        }
        ret = [...new Set(ret)];
        return ret;
    }

    /*
    * syno_finder : generic function for finding data with url source and txt, and regex.
    */
    async function syno_finder(txt, source, regex){
            return await new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: "GET",
                url: ""+source+txt,
                onload: function(response) {
                    if(response.status !== 200){
                        console.log("XML Syno - ERRROR");
                        autoP2.synoAsked.filter(item => item !== txt);
                        return;
                    }
                    let match;
                    let ret = [];
                    Array.from(response.responseText.matchAll(regex), x=>ret.push(x[1]));
                    resolve(ret);
            }
        });
        });
    }

    function launch_syno(){
        if(!autoP2.stop)setTimeout(syno,100);
    }

    async function syno(){
        let index = -1;
        for(let heat of autoP2.heatMapHeats){
            index ++;
            if (heat >= 100 || heat === undefined) continue;
            if (autoP2.synoAsked.includes(autoP2.heatMapWords[index])) continue;
            let syno_returns = await multiple_source_syn(autoP2.heatMapWords[index]);
            add_to_dico(syno_returns, 9 - Math.floor(heat / 20 ));
        }
        launch_syno();
    }

    // ==================================== Number revelator ============================
    function next_number(index=-1){
        let index_max = autoP2.lenMap.length; // Always be < to index_max
        while(index < index_max){
            index++;
            if(autoP2.heatMapWords[index] !== 'undefined' &&
               autoP2.heatMapHeats[index] != 100 &&
               !isNaN(autoP2.heatMapWords[index])){
                console.log("num index : " + index);
                return index;
            }
        }
        return -1;
    }

    async function number_to_dico(dico){
        add_to_dico(dico,num_prio);
        console.log("num to test : " + autoP2.managerInputWord[num_prio]);
        while(autoP2.managerInputWord[num_prio].length)await sleep(100);
        await sleep(500); // Need a KoolDown here.
    }

    async function number_brute(){
        // Reveal numbers :
        let numBase = [1,2,7,10,20,70,100,200,700,1000,2000,7000,10000];

        await number_to_dico(numBase);

        // Then list all numbers :
        let index = next_number(); // Index for heatMaps.
        while(index != -1){
            let actual = autoP2.heatMapWords[index];
            let digit = autoP2.lenMap[index];

            // Actual is minimum so UP then DOWN
            let dirUpDown = true;
            while(digit){
                if(autoP2.heatMapHeats[index] == 100)break; //found
                //direction
                let to_test = [Number(actual) + 1]; //dirUpDown true + false -
                if(!autoP2.testedWords.includes(to_test.toString())) await number_to_dico(to_test);
                let new_num = autoP2.heatMapWords[index];
                dirUpDown = (new_num != actual);

                if(autoP2.heatMapHeats[index] == 100)break; //found

                // brute in one direction.
                for(let i = 0; i < 9; i++){
                    if(autoP2.heatMapHeats[index] == 100)break; //found
                    let to_test = [Number(actual) + ((1 + (!dirUpDown * -2)) * Math.pow(10,digit-1))]; //dirUpDown true + false -
                    if(!autoP2.testedWords.includes(to_test.toString())) await number_to_dico(to_test);
                    let new_num = autoP2.heatMapWords[index];
                    if( new_num != actual){
                        actual = new_num;
                        continue;
                    }
                    else{
                        break;
                    }
                }//end_for
                digit--;
            }//end_while for specific number.
            index = next_number(); //looking for the next number.
        }//end_while on all numbers.
    } // end number_brute

    //===================================== Wiki search =======================================


// list all sentences.
    function sentences_finder(){
        let index = 0;
        const index_max = autoP2.lenMap.length;
        let sentences =[];
        while(index < index_max){
            let sentence = [];
             while(autoP2.heatMapHeats[index] !== undefined &&
                   autoP2.heatMapHeats[index] == 100){
                 sentence.push(autoP2.words_wiki[index]);
                 index++;
             }
            if(sentence.length != 0)sentences.push(sentence.join('+'));
            index++;
        }
        return sentences;
    }

    // take a sentence and search it on wikipedia.
    async function wiki_search(sentence){

            return await new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: "GET",
                url: "https://fr.wikipedia.org/w/index.php?search="+ sentence +"&title=Sp%C3%A9cial%3ARecherche&ns0=1",
                onload: function(response) {
                    if(response.status !== 200){
                        console.log("XML Wiki - ERRROR");
                        reject();
                        return;
                    }

                    let regex_1 = '<div class="mw-search-results-container">(.|\n)*<div id="mw-interwiki-results">';
                    let regex_2 = 'title="([^"]*)';
                    let compute = [];
                    let compute_2 = [];
                    let ret =[];

                    Array.from(response.responseText.matchAll(regex_1), x=>compute.push(x[0]));
                    compute = decodeHTMLEntities(compute[0]);
                    Array.from(compute.matchAll(regex_2), x=>compute_2.push(x[1]));
                    for(let el of compute_2){
                       ret = ret.concat( el.split(/,| |'/) );
                    }
                    // remove doubles
                    ret = [...new Set(ret)];

                    // remove already get words
                    ret = ret.filter((w)=>!autoP2.testedWords.includes(w));

                    resolve(ret);
            }
        });
        });

    }

    async function wiki(){
        const min_word = 2;
        let sentences = sentences_finder();
        for(let sentence of sentences){
            if(sentence.split('+').length < min_word ){
                continue;
            }
            if(autoP2.sentences_wiki.includes(sentence)){
                continue;
            }
            if(autoP2.stop)break;
            let words_to_test = await wiki_search(sentence);
            add_to_dico(words_to_test, 0);
            autoP2.sentences_wiki.push(sentence);
        }
        launch_wiki();
    }

    function launch_wiki(){
        if(!autoP2.stop)setTimeout(wiki,100);
    }

    // ====================================Auto new day =================================

    //Auto-reload page when new pedantix.
    async function getLastPedantix(){
                return await new Promise((resolve, reject) => {
                GM.xmlHttpRequest({
                    method: "POST",
                    mode:"cors",
                    data:'{"word":"kickmaker","answer":["kickmaker","kickmaker"]}',
                    headers: {
                        "Host": "cemantix.certitudes.org", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0", "Accept": "*/*", "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
                        "Content-Type": "application/json", "Referer": "https://cemantix.certitudes.org/pedantix", "Origin": "https://cemantix.certitudes.org", "DNT": "1",
                        "Sec-Fetch-Dest": "empty", "Sec-Fetch-Mode": "cors", "Sec-Fetch-Site": "same-origin", "Sec-GPC": "1", "Connection": "keep-alive"
                    },
                    credentials: "omit",
                    url: "https://cemantix.certitudes.org/pedantix/score",
                    onload: function(response) {
                               if(response.status !== 200){
                                   reject(false);
                                   return;
                               }
                                resolve(JSON.parse(response.responseText).num);
                                return;
                    }
                });
            });
    }
    async function autoReload(){
        let today = await getLastPedantix();
        while(today == false){ today = await getLastPedantix()};
        console.log("autoReload set, trigger on " + today);
        let stat = 0;
        let test = 0
        while(true){
            //Here we do nothing.
            /*
            if(test >= 100)reset(true);
            test++;*/
            const tomorow = await getLastPedantix();
            if(today == tomorow || tomorow == false){
                stat++;
                if(stat >= 10){
                    console.log("HeartBeep autoReload : ", tomorow);
                    stat = 0;
                }
                await sleep(1);
                continue;
            }
            // call the function that clear datas and reload page.
           reset(true);// Time to be fast !
        }
        console.log("autoReload error ?");
    }

    async function try_autoreload(){
        autoReload();
    }


    //===================================== debug =======================================
    function test()
    {
        console.log("//=================== report ======================")
        for(let obj of Object.keys(autoP2)){
            console.log(obj + " : ");
            console.log(autoP2[obj]);
            console.log("  ==  ==  ==  ==");
        }
    }
    // Look for stats.
    function advance(){
        let totalWord = autoP2.lenMap.length;
        let worldfund = autoP2.heatMapHeats.filter((word)=> word == 100).length;
        let wordtestted = autoP2.testedWords.length;
        let time_s = ((autoP2.stop_t ? autoP2.stop_t : Date.now()) - autoP2.start_t) / 1000;
        console.log( ""+ worldfund +"/"+totalWord+" ["+wordtestted+"] " + time_s.toFixed(2) +"s " );
    }

})();
