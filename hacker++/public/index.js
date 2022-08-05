// regitration
var p1= document.getElementById("p1");
var p2= document.getElementById("p2");

document.getElementById("reg-btn").addEventListener("click",function(){
    if(p1.value != p2.value){
        location.reload();
        document.getElementById("reg-para").innerHTML="Passwords do not match";
    }
});


