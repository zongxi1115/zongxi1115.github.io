// ==UserScript==
// @name         慕课通识课脚本
// @namespace    http://tampermonkey.net/
// @version      2024-09-23
// @description  try to take over the world!
// @author       Zongxi

// @match        https://www.icourse163.org/learn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=icourse163.org
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
function shua() {

    var Answers = [
        '',
        '',
        '',
        '',
        'biggest/Britain/private/Arts/Idea of/modesty/impersonal/Strictness/purpose/idealist',
        'multiple/2 hours and 45/Australia/matching/6/11-14/2-minute/2/3/level of difficulty',
        'Juda/4/The dis/Ang/Easter/the Bi/the Eas/The Re/the Pop/Pro',
        'omni/sphinx/uranus/leto/metis/rhea/sea/artem/heracles/leda', //8
        'colla/ritual/jane/wild/comm/thea/putting/41/commercial/off',
        'flower/emily/corre/birth/chry/red rose/apollo/lotus/above/above',
        'indivi/greek/cultures/jesus/chinese/ABC/gold/respect/construct/peril',
        'spring/first/arrival/above/gift m/putting/attracting/abundance/luckiest/from the line',
        'charlie/deadpan/oneself/cartoon/satire/laugh/paro/comedy/optim/humor',
        'polite/[ɪgˈzæmpl]/individual/[ˈhɒstaɪl]/tradition, conservative, omit, progressive/of a word,pron/volution,engl/vowels,ga/garage [gəˈrɑʒ], tomato [təˈmeɪtoʊ], neither [ˈniðɚ]/strict and formal, heritage, extroverted, diversity',
        'comm/urgent/doctors/private/medicare/insurance/plan/card/provider/premium',
        'better deal/products/less/above/20 to 45/tenants/three months/one-month/renting/one month notice',
        'four thousand/green/black/nothing/butter/above/11:00/4 to 5/meat/above',
        'prompt/1400s/business/15 and 20%/banker/1910/1920s/10%/waiter/customer was'
    ]

    let content = document.querySelector('.j-title.f-fl').innerHTML;
    let unit = parseInt(content.split('&nbsp;').splice(-1)[0].substring(0, content.length - 1)) - 1
    // console.log(unit);
    if (unit <= 3) {
        alert('前4课不提供答案请自行解决')
    }



    var answers = Answers[unit].split("/")
    if (answers.length != 10) {
        console.error("answers length is not 10!!!")
    } else {
        let els = document.querySelectorAll(".m-choiceQuestion")



        var index = 0;
        var randomMS = Math.floor(Math.random() * 1000) + 10000;

        var timer = setInterval(() => {
            let options = Array.from(els[index].querySelectorAll(".f-richEditorText.optionCnt")).map(el => el.textContent.toLowerCase().replaceAll(" ", ""))
            // console.log(options);
            let lis = els[index].querySelector(".choices.f-cb").querySelectorAll("li")
            let target = 0;
            options.forEach(option => {
                let t = answers[index]
                if (option.includes(t.toLowerCase().replaceAll(" ", ""))) {
                    target = options.indexOf(option)
                    // console.log(target)
                }
            })
            lis[target].querySelector("input").click();
            index++;
            if (index >= answers.length) {
                clearInterval(timer);
            }
        }, randomMS);

    }
}



let btn = document.createElement("button");
btn.textContent = "开始刷题";
//document.body.appendChild(btn);
// style
let style = {
    'background-color': '#09f',
    'color': '#fff',
    'padding': '10px',
    'border-radius': '5px',
    'font-size': '18px',
    'cursor': 'pointer',
    'position': 'fixed',
    'top': '10px',
    'right': '10px',
    'outline': 'none',
    'z-index': '999',
    'border': 'none'
}
for (let key in style) {
    btn.style[key] = style[key];
}
// btn.addEventListener('click', onclick);
let li = document.createElement("li");
let a_li = document.createElement("a");
li.appendChild(a_li)
// a_li.href = "javascript:void(0)";

a_li.textContent = "开始刷题";
a_li.className = 'f-thide f-fc3'
li.classList.add("u-greentab")
li.classList.add("j-tabitem")
document.querySelector("#j-courseTabList").appendChild(li)
li.onclick = onclick;
function onclick() {

    let confirm = window.confirm("请注意：请进入到答题页面时点击，否则出现bug，网页崩溃等问题后果自负！");
    if (confirm) {
        shua();
    }
}




})();
