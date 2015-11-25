/*
MyWordpressPosts
	Display my latests posts on my StartBootstrap Freelancer page

	Joseph Haaga
*/


var request2 = new XMLHttpRequest();
    request2.open("GET", "https://public-api.wordpress.com/rest/v1.1/sites/haagajoe.wordpress.com/posts", true);
    //request2.setRequestHeader("X-Parse-Application-Id", "4oeswsX6cMNLE868TP1VFDDDVUtlQ4mqGmPX6PFk");
    //request2.setRequestHeader("X-Parse-REST-API-Key", "jPSf6IpAPqe0PBRcbfVP30uqBzxENK9qvz5WaC4u");
    console.log(request2.responseText);
    request2.onreadystatechange = function() {//Call a function when the state changes.
        if (request2.readyState == 4 && request2.status == 200) {
            var responsearray = JSON.parse(request2.responseText);
            console.log(responsearray);
            var i=0;
      /*      while(i<responsearray['results'].length){
                if(responsearray['results'][i]['sentiment']=='positive'){
                  positive_mentions.push(responsearray['results'][i]);
                }else if(responsearray['results'][i]['sentiment']=='negative'){
                        negative_mentions.push(responsearray['results'][i]);
                    }else{
                        console.log('neutral opinion; not printed');
                    }
                i++;
            }
            writeResults(positive_mentions,negative_mentions);
*/
	 }
    }
request2.send();
