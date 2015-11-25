/*
MyWordpressPosts
	Display my latests posts on my StartBootstrap Freelancer page

	Joseph Haaga
*/


var request2 = new XMLHttpRequest();
    request2.open("GET", "https://public-api.wordpress.com/rest/v1.1/sites/haagajoe.wordpress.com/posts", true);
   console.log(request2.responseText);
    request2.onreadystatechange = function() {//Call a function when the state changes.
        if (request2.readyState == 4 && request2.status == 200) {
            var responsearray = JSON.parse(request2.responseText);
            console.log(responsearray);
            var i=0;
	 }
    }
request2.send();
