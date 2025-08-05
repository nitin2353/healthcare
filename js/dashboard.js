
        let highRisk = document.querySelector('.highRisk');
        let mordrateRisk = document.querySelector('.mordrateRisk');
        let lowRisk = document.querySelector('.normalRisk');

        let p_l = document.querySelector('.p_l');
        let p_m = document.querySelector('.p_m');
        let p_h = document.querySelector('.p_h');

        let cards_contain = document.querySelector('.cards-container'); 
        var div1='';
        document.addEventListener('DOMContentLoaded', () => {
                fetch('/alluser')
                .then(Response => Response.json())
                .then(elements => {
                    
                    elements.forEach((data, i) => {
                        if(i % 2 === 0){
                            div1 = document.createElement('div');
                            div1.className = 'row me-2';
                            cards_contain.appendChild(div1);
                        }

                        let div2 = document.createElement('div');
                        div2.className = 'col me-1 mb-3 border m-3 p-3 card';
                        let h5 = document.createElement('h5');
                        h5.innerHTML = data.name;
                        let age = document.createElement('p');
                        age.innerHTML = 'Age : '+data.age
                        let gender = document.createElement('p');
                        gender.innerHTML = 'Gender : '+data.gender
                        let date = document.createElement('p');
                        date.innerHTML = 'Report Date : '+data.created_at.slice(0,10)
                        // let riskrate = document.createElement('p');
                        // riskrate.innerHTML = 'Risk Level'
                        // let rate = document.createElement('span');
                        // rate.className = 'risk';
                        // riskrate.appendChild(rate);
                        
                        div2.appendChild(h5);
                        div2.appendChild(age);
                        div2.appendChild(gender);
                        div2.appendChild(date);
                        // div2.appendChild(riskrate);
                        div1.appendChild(div2);

                        if(elements.length % 2 != 0){
                            if(i == elements.length-1){
                                let div2 = document.createElement('div');
                                div2.className = 'col me-1 mb-3 m-3 p-3';
                                div1.appendChild(div2);
                            }
                        }
                        
                    });
                    

                })


                fetch('/detailBoard')
                .then(Response => Response.json())
                .then(data => {
                    data.forEach((elements) => {
                        console.log(elements);
                        if(elements.high.replace('%','') >= 40){
                            let h = parseInt(highRisk.innerHTML) || 0;
                            h += 1;
                            highRisk.innerHTML = h + ' Reports Need Attentions';
                        }

                        if(elements.moderate.replace('%','') >= 20 && elements.moderate.replace('%','') <= 30){
                            let m = parseInt(mordrateRisk.innerHTML) || 0;
                            m += 1;
                            mordrateRisk.innerHTML = m + ' Reports Mordrate';
                        }

                        if(elements.low.replace('%','') >= 20){

                            let l = parseInt(lowRisk.innerHTML) || 0;
                            l += 1;
                            lowRisk.innerHTML = l + ' Reports Normal';
                        }
                        
                        
                    })
                    document.querySelector('.rcount').innerHTML = data.length;
                    p_l.value = avg('low');
                    document.querySelector('.prog_low').innerHTML = p_l.value + '%';
                    p_m.value = avg('mod');
                    document.querySelector('.prog_mod').innerHTML = p_m.value + '%';
                    p_h.value = avg('high');
                    document.querySelector('.prog_high').innerHTML = p_h.value + '%';
                   
                    function avg(risk) {
                        let sum = 0;
                        let count = 0;
                        data.forEach(e => {
                            let value = 0;
                            if (risk === "low" && e.low) {
                                value = parseInt(e.low.replace('%', '')) || 0;
                            } else if (risk === "mod" && e.moderate) {
                                value = parseInt(e.moderate.replace('%', '')) || 0;
                            } else if (risk === "high" && e.high) {
                                value = parseInt(e.high.replace('%', '')) || 0;
                            }
                            if (value > 0) {
                                sum += value;
                                count++;
                            }
                        });
                        return count > 0 ? Math.round(sum / count) : 0;
                    }
                    

                })



        })
