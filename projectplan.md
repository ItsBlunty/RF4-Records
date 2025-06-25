DO NOT USE THIS YET!


 - Currently the scraping system is working well, our frontend works, but have issues with loading times because we're pushing too much to the frontend.

 - Currently we are using grouped views for both baits and fish, and we want to maintain these.


 - My thoughts are to do the following: (Make sure to store the latest date created on you see as well, so we know where to start when we update the maps.)

 - We should remove all filtering for time periods (like 1 hour, 6 hours, etc), and instead we will have filtering be based on the start of the last high-volume period (Sundays at 6PM UTC).

 - Build a "map" that holds a list of fish names, the count of each fish name seen, and then the corresponding data for the highest weight entry for each fish name in the database, including all columns from the database.

 - Build a "map" that holds a list of bait names, and then the corresponding data for the highest weight entry for each bait name in the database, including all columns from the database. Make sure you account for sandwich baits, which are where we have two baits for one row. That will be its own unique entry in the bait names list.

 