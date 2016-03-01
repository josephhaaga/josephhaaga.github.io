/*
MyWordpressPosts
	Display my latests posts on my StartBootstrap Freelancer page

	Joseph Haaga
*/


var request2 = new XMLHttpRequest();
    request2.open("GET", "https://public-api.wordpress.com/rest/v1.1/sites/www.devcurio.us/posts", true);
   console.log(request2.responseText);
    request2.onreadystatechange = function() {//Call a function when the state changes.
        if (request2.readyState == 4 && request2.status == 200) {
            var responsearray = JSON.parse(request2.responseText);
            // document.getElementById("header").innerHTML = "location.href='"+responsearray['posts'][1]['featured_image'];
            console.log(responsearray);
            /* write posts to Wordpress modals */
            for(i=0;i<6;i++){
                console.log("\nwriting Wordpress post #"+i);
                var title = "post"+i+"title";
                var image = "post"+i+"image";
                var thumb = "post"+i+"thumb";
                var descript = "post"+i+"descrip";
                var link = "post"+i+"link";
                var locationstring = "location.href='"+responsearray['posts'][i]['URL']+"'";
                document.getElementById(title).innerHTML = responsearray['posts'][i]['title'];
                // document.getElementById(publishDate).innerHTML = responsearray['posts'][i]['title'];
                // document.getElementById(image).setAttribute("src",responsearray['posts'][i]['featured_image']);
                // document.getElementById(descript).innerHTML = responsearray['posts'][i]['excerpt']; 
                // document.getElementById(thumb).setAttribute("src",responsearray['posts'][i]['featured_image']);
                document.getElementById(link).setAttribute("href",responsearray['posts'][i]['URL']);
            }
            
	 }
    }
request2.send();




