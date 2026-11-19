accessCode: "1"                                                                                                                   
  Count: 3                                                     
  Slugs: FRV, portoftownsville, sacredheartmission 
  
accessCode: "0" 
Count: 80                                                                                                                         
Slugs: UOA, sanitarium, gcla, grlc, mcdonaldsgladstone, afp, jaycar, vicpol, boyne, bhmining, rrtest, sealink, adairs, riotinto,
    bunningsng, nhulundu, boardriders, nwrh, atworkdbowman, gsss, anglicare, safegroup, chanelcollege, atworklangford, ausfield,
    roche, genustaff, Genuclients, TownsvilleCC, nrggladstone, Bellview-James-please-delete, Belview, theville, riotinto-workpac,
    gawb, aurizon, sofitelmelbourne, intojobsgladstone, tannumsands, programmed, wicet, Gemco, Lyonsconstruction, danmurphys,
    baptistcamping, kokodatours, Abervalerv, GPCL, ourcommunity, nqdrytropics, rslatersons, highlinegroup, Infrastructurepa,
    tacgeelong, alphahpa, JHG, IHAS, doe, afp-test, cultura, afp-sydney, landerandrogers, dancearts, ccma, grps, qaelectrical,
    cutulielectrical, protonpower, DETSI, jemena, ELV, clarke-energy, yarratrams
    
accessCode: NOT SET
Count: 30
Slugs: DFAT, aemo, yourtownwhs, forsight, rightathome, qantas, jetstar, ymca, trains, sonas, boral, krispykreme, mable, redr,
    yarra-trams, gforce, kfc, yourtowntraining, jetstarmhfa, metrotrains, UOM-deactivated, scope, barwonasset, bsl, Lorem,
    recruitflex, rafa, hosking, cementaustralia, calliopeshs, salvos, catogroup, ibac, downergroup, fennerconveyors, pov,
    sydneyfestival, msq, awcc, srgglobal, srgglobalaus, aus-ag, mata, chandler-macleod

<?php
$slugs = ['DFAT', 'aemo', 'yourtownwhs'];                                                                                         
$updated = 0;   

foreach ($slugs as $slug) {
    $form = DB::table('client_forms')->where('slug', $slug)->first();
    if (!$form) {
        echo "Not found: {$slug}\n";
        continue;
    }
    $config = json_decode($form->config ?? '{}', true) ?: [];
    if (isset($config['accessCode'])) {
        echo "Already set: {$slug} => {$config['accessCode']}\n";
        continue;
    }
    $config['accessCode'] = '1';
    DB::table('client_forms')->where('id', $form->id)->update([
        'config' => json_encode($config),
    ]);
    echo "Updated: {$slug}\n";
    $updated++;
}

echo "\nTotal updated: {$updated}\n";