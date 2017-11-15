/**
 * Measure-gurps modification: gurpsGetRangeModifier() converts to hexes and determines to hit modifier
 * Modified by:                Ken Foubert
 * Contact:                    https://app.roll20.net/users/945642/ken-f
 * Modified date:              11/12/2017
 * 
 * How To Install: 
 * You must have a Pro subscription
 * Go to your games landing page, click on Settings then click on API Scripts
 * Click on the New Script Tab
 * Set Name: measure.js
 * Copy/paste all the code in this file to the webpage
 * Press "Save Script"
 * You should get a success message and the script is ready to use
 * 
 * How to Use:
 * Start your game
 * Select 2 or more tokens, for this script suggest just 2 tokens
 * Go to the chat box
 * Type: !measure
 * Result will look like: Measure:
 *                           Measurements:
 *                          Thug to Jewel: 4 hex (-2 to hit) 
 * 
 * Whisper to player type: !wmeasure [player or character name]
 *  
 * BASED ON The Aaron's Measure script 
 * Measure:  measure distances between 2 or more tokens
 * By:       The Aaron, Arcane Scriptomancer
 * Github:   https://github.com/shdwjk/Roll20API/blob/master/Measure/Measure.js
 * Contact:  https://app.roll20.net/users/104025/the-aaron
 * 
 * measure-gurps.js is a trademark of Steve Jackson Games, and its rules and art are copyrighted by Steve Jackson Games. 
 * All rights are reserved by Steve Jackson Games. This game aid is the original creation of Ken Foubert and is released 
 * for free distribution, and not for resale, under the permissions granted in the 
 * Steve Jackson Games Online Policy (http://www.sjgames.com/general/online_policy.html)
 */

var Measure = Measure || (function() {
    'use strict';

    var version = '0.3.2',
        lastUpdate = 1490870046,

	checkInstall = function() {
        log('-=> Measure v'+version+' <=-  ['+(new Date(lastUpdate*1000))+']');
	},

    handleInput = function(msg) {
        var args,
            pageid,
            page,
            measurements,
            whisper = false,
    	    who;

		if (msg.type !== "api") {
			return;
		}

		args = msg.content.split(/\s+/);
		switch(args.shift()) {
            case '!wmeasure':
                whisper = true;
				who=(getObj('player',msg.playerid)||{get:()=>'API'}).get('_displayname');
                // break; // Intentional fall through

            case '!measure':
               measurements = _.chain(_.union(args,_.pluck(msg.selected,'_id')))
					.uniq()
					.map(function(t){
						return getObj('graphic',t);
					})
					.reject(_.isUndefined)
                    .map(function(t){
                        pageid=t.get('pageid');
                        return {
                                name: t.get('name') || "Token @ "+Math.round(t.get('left')/70)+','+Math.round(t.get('top')/70),
                                x: t.get('left'),
                                y: t.get('top')
                            };
                    })
                    .reduce(function(m,t,k,l){
                        _.each(_.rest(l,k+1),function(t2){
                            m.push({
                                name1: t.name,
                                name2: t2.name,
                                distance: (Math.sqrt( Math.pow( (t.x-t2.x),2)+Math.pow( (t.y-t2.y),2))/70)
                                });
                        });
                        return m;
                    },[])
                    .value()
                    ;
                page=getObj('page',pageid);
                if(page) {
                    _.chain(measurements)
                        .reduce(function(m,e){
                            var d=Math.round(page.get('scale_number')*e.distance,2);
                            m.push("<li>"+e.name1+" to "+e.name2+": <b>"+d+" "+page.get('scale_units')+" ("+gurpsGetRangeModifier(d, page.get('scale_units'))+" to hit)</b></li>");
                            return m;
                        },[])
                        .join('')
                        .tap(function(o){
                            sendChat('Measure',(whisper ? '/w "'+who+'"' : '/direct')+' <div><b>Measurements:</b><ul>'+o+'</ul></div>');
                        });
                    
                    
                }
                break;
            }
    },

    
    /**
     * Get to hit modifer based on number of hexes
     * 1 yard = 1 hex
     * 
     * @param int    value Distance 
     * @param string Unit of measure used for distance
     * 
     * @return int
     */
    gurpsGetRangeModifier = function(value, scale) {

        // declare vars
        var modifier = 0;
        var hexes = 0;
        var multiplier = 0;

        // create an array of the scale and multiplier
        // scales: ft, m, km, mi, in, cm, un, hex, sq
        var arrScale = new Array();
        
        // 3' = 1 yard
        // yard = round(value / 3')
        arrScale['ft'] = .33333;

        // 1 meter = 1.09361 yards
        // yards = X Meters * 1.09361 yards/meter
        arrScale['m'] = 1.09361;
        
        // 1 kilometer = 1093.61 yards
        // yards = X kilometers * 10936.61 yards/kilometers
        arrScale['km'] = 10936.61;
        
        // 1 mile = 1760 yards
        // yards = X miles * 1760 yards/mile
        arrScale['mi'] = 1760;

        // 1 inch = 0.0277778 yards
        // yards = X inches * 0.0277778 yards/inch
        arrScale['in'] = 0.0277778;

        // 1 centimeter = 0.0109361 yards
        // yards = X centimeters * 0.0109361 yards/inch
        arrScale['cm'] = 0.0109361;

        // all these units are 1 to 1
        // just assume unit (un.) is a hex
        // hey, hex to hex
        // sq. probably means square, just use the value
        arrScale['un'] = 1;
        arrScale['hex'] = 1;
        arrScale['sq'] = 1;

        // check for scale
        if (arrScale[scale] === undefined) {
            
            // not found, assume 1
            multiplier = 1;

        } else {

            // get multiplier for scale
            multiplier = arrScale[scale];

        }

        // now get hexes based on scale
        hexes = Math.round(value * multiplier);

        // now determine to hit modifier based on hexes
        // See GURPS 4th Edition - Campaigns Page 550
        switch (true) {

            case (0 <= hexes && hexes < 3):
                modifier = 0;
                break;

            case (hexes == 3 ):
                modifier = -1;
                break;

            case (3 < hexes && hexes <= 5):
                modifier = -2;
                break;

            case (5 < hexes && hexes <= 7):
                modifier = -3;
                break;

            case (7 < hexes && hexes <= 10):
                modifier = -4;
                break;

            case (10 < hexes && hexes <= 15):
                modifier = -5;
                break;

            case (15 < hexes && hexes <= 20):
                modifier = -6;
                break;

            case (20 < hexes && hexes <= 30):
                modifier = -7;
                break;

            case (30 < hexes && hexes <= 50):
                modifier = -8;
                break;

            case (50 < hexes && hexes <= 70):
                modifier = 09;
                break;

            case (70 < hexes && hexes <= 100):
                modifier = -10;
                break;

            case (100 < hexes && hexes <= 1000):
                modifier = -16;
                break;

            case (hexes < 1000 && hexes <= 10000):
                modifier = -22;
                break;

            case (hexes < 10000 && hexes <= 100000):
                modifier = -28;
                break;

            default:
                modifier = 0;
                break;

        }   //switch

        return modifier;

    },

    registerEventHandlers = function() {
        on('chat:message', handleInput);
    };

    return {
		CheckInstall: checkInstall,
        RegisterEventHandlers: registerEventHandlers
    };
    
}());

on('ready',function() {
    'use strict';

    Measure.CheckInstall();
    Measure.RegisterEventHandlers();
});
