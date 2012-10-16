// TODO:
//      data on the far right is being useless. Can we change this?
//      think about using a moving average instead of binning ???
//      !! get data to always be at the back. I think it has something to do with the mega data object trickery. It might need some sorting. :)
//      - nope. it has to do with updates not killing and re-making objects. this is normal I guess.
//      - possible solution is to make it always on top, but with transparency

var binnedLineChart = function () {
  var outlinesOrNot = true;

  var margins = {top: 0, left: 25, bottom: 25, right: 25};

  var height = 150;
  var width = d3.max([window.innerWidth, screen.width]);

  var howManyBinLevels = 6;
  var whichLevelsToRender = [1, 2, 3];
  var whichLinesToRender = ['rawData', 'averages', 'maxes', 'mins'];
  var interpolationMethod = ['linear'];

  var bkgrect;
  var frgrect;
  var defclip;
  var xAxisContainer;
  var xAxis;
  var yAxisContainer;
  var yAxis;
  var xScale;
  var yScale;
  var xAxisScale;
  var flatLined0; // a useful average line for interpolation purposes

  var chart;
  var paths;

  var slctn; // Save the selection so that my.update() works.


  var my = function (selection) {
    my.setSelectedLines();
    slctn = selection; // Saving the selection so that my.update() works.

    realWidth = width - margins.right - margins.left;

    selection.each(function (data) {

      var binData = {
        keys : ['averages', 'maxes', 'mins'],
        rawData : {
          data  : new Array(),
          d0    : new Array(),
          colour: '#BBB'
        },
        averages: {
          data  : new Array(),
          d0    : new Array(),
          colour: '#F00',
          func  : function (a, b) { return (a+b)/2; }
        },
        maxes : {
          data  : new Array(),
          d0    : new Array(),
          colour: '#0F0',
          func  : function (a, b) { return d3.max([a, b]); }
        },
        mins : {
          data  : new Array(),
          d0    : new Array(),
          colour: '#00F',
          func  : function (a, b) { return d3.min([a, b]); }
        },
      };

      binData.rawData.data[0] = data;


      var binTheDataWithFunction = function (datas, func) {
        var bDat = new Array();
        var i = 0;
        for(i = 0; i < datas.length; i = i + 2){
          if (i % 2 == 0) {
            if (datas[i+1]){
              bDat.push( func( datas[i], datas[i+1]));
            }else{
              bDat.push( datas[i] );
            }
          }else{
            // do nothing;
          }
        }
        return bDat;
      }


      // populate the binned datas (binData):
      var j = 0;
      for (var key in binData['keys']){ // for each of 'average', 'max', 'min'
        binData[binData.keys[key]]['data'][0] = data;

        //TODO: refactor this type of thing so it's more like function(binData[binData.keys[key]]), so we don't have to keep tying that out a bunch of times. :)
        for (j = 1; j < howManyBinLevels; j++){ // for each bin level
          binData[binData.keys[key]]['data'][j] = binTheDataWithFunction(binData[binData.keys[key]]['data'][j-1], binData[binData.keys[key]]['func']);
        }
      }


      if (!xScale) { xScale = d3.scale.linear().domain([0, data.length - 1]); }
      xScale
        .range([0, realWidth]); // So that the furthest-right point is at the right edge of the plot

      if (!xAxisScale) { xAxisScale = d3.scale.linear().domain([0, data.length - 1]); } //different than xScale because we want the right-most point to be at the right edge of the chart
      xAxisScale
        .range([0, realWidth]);

      if (!yScale){ yScale = d3.scale.linear(); }
      yScale
        .domain([d3.min(data), d3.max(data)])
        .range([0, height]);

      var fillScale = d3.scale.linear()
        .domain([0, d3.max(data)])
        .rangeRound([255, 0]);


      //Generate all d0s. (generate the lines paths)

      flatLined0 = d3.svg.line()
        .x(function (d, i) { return xScale(i); })
        .y(function (d, i) { return d3.avg(binData.rawData.data[0]); })
        .interpolate("linear");

      binData.rawData.d0[0] = d3.svg.line()
        .x(function (d, i) { return xScale(i); })
        .y(function (d, i) { return yScale(binData.rawData.data[0][i]); })
        .interpolate(interpolationMethod)(binData.rawData.data[0]);

      var interpolateStraight = function(d0prime) {
        //go through a d0 and double every (H,V) entry
        var str = d0prime;
        var result = str.replace(/(H[0-9.]*)(V[0-9.]*)/gi, "$1$2$1$2");
        //result = result.replace(/(H[0-9.]*)(V[0-9.]*)/i, "$1$2$1$2");
        return result;
      }

      //make both the same length
      var interpolateLength = function(d0from, d0to) {
        var count1 = d0from.match(/H/gi).length;
        var count2 = d0to.match(/H/gi).length;
        var howmanytimesmore = Math.round(count2 / count1);
        var howmanytimesless = Math.round(count1 / count2);

        resultFrom = d0from;
        resultTo = d0to;

        var i = 0;

        if (howmanytimesmore > 1) {
          for (i = 1; i < howmanytimesmore; i++) {
            resultFrom = resultFrom.replace(/(H[0-9.]*)(V[0-9.]*)/gi, "$1$2$1$2");
          }
        }else if (howmanytimesless > 1) {
          for (i = 1; i < howmanytimesless; i++) {
            resultTo = resultTo.replace(/(H[0-9.]*)(V[0-9.]*)/gi, "$1$2$1$2");
          }
        }

        //console.log(resultFrom.length + ": " + resultFrom);
        //console.log(resultTo.length + ": " + resultTo);
        return [resultFrom, resultTo];
      }

      for (var key in binData['keys']) { // for each of 'average', 'max', 'min'
        var j = 0;

        binData[binData['keys'][key]].d0[0] = binData['rawData'].d0[0];
        var d0bigdata = "M0,14.559819413092542H41.449449449449446V14.55981941309254H82.89889889889889V44.13092550790064H124.34834834834835V44.13092550790064H165.79779779779778V69.97742663656881H207.24724724724726V15.801354401805854H248.6966966966967V15.801354401805852H290.1461461461461V33.74717832957105H331.59559559559557V33.74717832957105H373.045045045045V79.23250564334082H414.4944944944945V16.027088036117323H455.94394394394396V16.02708803611732H497.3933933933934V34.53724604966135H538.8428428428429V34.53724604966135H580.2922922922922V57.11060948081259H621.7417417417417V24.492099322799035H663.1911911911911V24.492099322799035H704.6406406406405V40.06772009029342H746.09009009009V40.06772009029342H787.5395395395396V62.302483069977384H828.988988988989V17.042889390519168H870.4384384384383V17.042889390519168H911.8878878878879V62.86681715575614H953.3373373373374V62.86681715575614H994.7867867867868V67.60722347629792H1036.2362362362362V27.53950338600449H1077.6856856856857V27.53950338600449H1119.1351351351352V37.133182844243784H1160.5845845845845V37.133182844243784H1202.034034034034V47.96839729119639H1243.4834834834835V25.282167042889334H1284.932932932933V25.282167042889334H1326.3823823823823V27.31376975169294H1367.8318318318318V27.31376975169294H1409.281281281281V69.52595936794579H1450.7307307307308V31.828442437923176H1492.18018018018V31.828442437923176H1533.6296296296296V34.53724604966135H1575.0790790790793V34.53724604966135H1616.5285285285286V39.954853273137694H1657.977977977978V31.715575620767442H1699.4274274274273V31.715575620767442H1740.8768768768766V29.90970654627538H1782.3263263263264V29.90970654627538H1823.7757757757759V51.015801354401766H1865.2252252252251V9.593679458239214H1906.6746746746749V9.593679458239215H1948.1241241241241V37.810383747178264H1989.5735735735736V37.810383747178264H2031.023023023023V43.792325056433356H2072.4724724724724V36.11738148984194H2113.921921921922V36.11738148984194H2155.3713713713714V22.00902934537241H2196.8208208208207V22.00902934537241H2238.2702702702704V56.433408577878104H2279.7197197197197V19.413092550790058H2321.169169169169V19.413092550790058H2362.6186186186187V22.121896162528145H2404.068068068068V22.121896162528145H2445.5175175175177V81.6027088036117H2486.966966966967V6.884875846501121H2528.4164164164163V6.884875846501124H2569.865865865866V38.826185101580116H2611.3153153153153V38.826185101580116H2652.7647647647645V55.86907449209927H2694.2142142142143V36.343115124153485H2735.6636636636636V36.343115124153485H2777.1131131131133V28.668171557562072H2818.562562562562V28.668171557562072H2860.012012012012V39.61625282167041H2901.4614614614616V21.896162528216678H2942.910910910911V21.896162528216678H2984.36036036036V26.975169300225662H3025.80980980981V26.975169300225662H3067.259259259259V54.401805869074416H3108.708708708709V18.39729119638821H3150.1581581581586V18.39729119638821H3191.6076076076074V7.67494356659142H3233.057057057057V7.67494356659142H3274.5065065065064V32.95711060948076H3315.955955955956V23.814898419864555H3357.4054054054054V23.814898419864555H3398.8548548548547V14.446952595936727H3440.3043043043044V14.446952595936727H3481.7537537537532V52.03160270880361H3523.203203203203V32.50564334085774H3564.6526526526527V32.50564334085774H3606.102102102102V33.9729119638826H3647.5515515515517V33.9729119638826H3689.001001001001V69.30022573363424H3730.4504504504503V22.347629796839698H3771.8998998999V22.347629796839698H3813.3493493493497V46.726862302483H3854.7987987987985V46.726862302483H3896.2482482482483V72.23476297968396H3937.6976976976975V14.446952595936729H3979.1471471471473V14.446952595936729H4020.5965965965966V30.248306997742663H4062.046046046046V30.248306997742663H4103.495495495496V40.85778781038372H4144.944944944945V15.349887133182838H4186.394394394394V15.349887133182838H4227.843843843844V22.347629796839698H4269.293293293293V22.347629796839698H4310.742742742743V74.49209932279904H4352.192192192192V33.634311512415316H4393.641641641641V33.634311512415316H4435.091091091091V43.34085778781035H4476.540540540541V43.34085778781035H4517.98998998999V44.13092550790064H4559.439439439439V12.866817155756134H4600.888888888889V12.866817155756134H4642.338338338338V43.45372460496608H4683.787787787788V43.45372460496608H4725.237237237237V65.46275395033858H4766.686686686687V33.1828442437923H4808.136136136136V33.1828442437923H4849.585585585585V31.03837471783296H4891.035035035035V31.03837471783296H4932.484484484484V53.9503386004514H4973.933933933934V26.63656884875846H5015.383383383383V26.63656884875846H5056.8328328328325V48.19413092550786H5098.282282282283V48.19413092550786H5139.731731731732V70.54176072234763H5181.181181181181V16.59142212189615H5222.630630630631V16.59142212189615H5264.08008008008V51.58013544018051H5305.529529529529V51.58013544018051H5346.978978978979V78.89390519187353H5388.428428428429V28.781038374717806H5429.877877877877V28.781038374717806H5471.327327327327V41.08352144469519H5512.776776776776V41.08352144469519H5554.226226226227V68.51015801354394H5595.675675675676V56.32054176072229H5637.125125125124V56.32054176072229H5678.574574574574V60.383747178329514H5720.024024024024V60.383747178329514H5761.473473473474V65.46275395033858H5802.922922922923V45.485327313769695H5844.372372372372V45.485327313769695H5885.821821821822V27.878103837471773H5927.271271271271V27.878103837471773H5968.72072072072V54.51467268623023H6010.17017017017V41.196388261851006H6051.61961961962V41.196388261851006H6093.069069069068V36.23024830699767H6134.518518518518V36.23024830699767H6175.9679679679675V54.7404063205417H6217.417417417418V12.7539503386004H6258.866866866867V12.753950338600404H6300.316316316317V31.37697516930016H6341.7657657657655V31.37697516930016H6383.215215215215V82.84424379232502H6424.664664664665V25.282167042889334H6466.114114114114V25.282167042889334H6507.5635635635645V48.3069977426636H6549.013013013013V48.3069977426636H6590.462462462462V58.12641083521443H6631.911911911912V36.90744920993224H6673.361361361362V36.90744920993224H6714.810810810811V47.74266365688484H6756.26026026026V47.74266365688484H6797.709709709709V72.23476297968396H6839.159159159159V26.749435665914195H6880.608608608609V26.749435665914195H6922.058058058058V20.541760722347554H6963.5075075075065V20.541760722347554H7004.956956956957V55.191873589164715H7046.406406406406V17.49435665914218H7087.855855855856V17.49435665914218H7129.305305305305V45.598194130925506H7170.754754754756V45.598194130925506H7212.204204204204V75.1693002257336H7253.653653653653V27.878103837471773H7295.103103103103V27.878103837471773H7336.552552552553V24.040632054176022H7378.002002002002V24.040632054176022H7419.451451451451V68.96162528216703H7460.9009009009005V25.846501128668162H7502.35035035035V25.846501128668162H7543.7997997998V41.9864559819413H7585.249249249249V41.9864559819413H7626.698698698699V57.44920993227987H7668.148148148148V22.347629796839698H7709.597597597597V22.347629796839698H7751.047047047047V73.47629796839728H7792.496496496497V52.93453724604964H7833.945945945947V52.93453724604964H7875.395395395395V37.92325056433408H7916.844844844844V37.92325056433408H7958.294294294295V48.3069977426636H7999.743743743744V48.3069977426636H8041.193193193193V58.803611738148916H8082.642642642642V25.282167042889334H8124.092092092092V25.282167042889334H8165.541541541542V39.61625282167041H8206.990990990991V39.61625282167041H8248.440440440441V76.97516930022566H8289.88988988989V19.074492099322775H8331.339339339338V19.074492099322775H8372.788788788788V28.668171557562072H8414.238238238238V28.668171557562072H8455.687687687689V80.58690744920986H8497.137137137137V34.762979683972894H8538.586586586585V34.762979683972894H8580.036036036036V41.873589164785486H8621.485485485486V41.873589164785486H8662.934934934936V75.9593679458239H8704.384384384384V36.343115124153485H8745.833833833833V36.343115124153485H8787.283283283283V28.668171557562072H8828.732732732733V28.668171557562072H8870.182182182181V84.7629796839729H8911.631631631632V33.1828442437923H8953.081081081082V33.1828442437923H8994.53053053053V57.90067720090289H9035.97997997998V57.90067720090289H9077.429429429429V68.51015801354394H9118.878878878879V17.49435665914218H9160.328328328329V17.49435665914218H9201.777777777777V37.133182844243784H9243.227227227228V37.133182844243784H9284.676676676676V53.27313769751692H9326.126126126126V22.00902934537241H9367.575575575576V22.00902934537241H9409.025025025025V46.83972911963881H9450.474474474475V46.83972911963881H9491.923923923923V62.41534988713312H9533.373373373373V10.60948081264106H9574.822822822824V10.60948081264106H9616.272272272272V39.05191873589158H9657.721721721722V39.05191873589158H9699.17117117117V81.48984198645597H9740.62062062062V27.652370203160224H9782.07007007007V27.652370203160224H9823.51951951952V50.67720090293448H9864.968968968968V50.67720090293448H9906.418418418418V59.480812641083475H9947.867867867868V35.10158013544017H9989.317317317318V35.10158013544017H10030.766766766767V54.7404063205417H10072.216216216215V54.7404063205417H10113.665665665665V68.84875846501123H10155.115115115115V35.21444695259591H10196.564564564565V35.21444695259591H10238.014014014014V40.40632054176071H10279.463463463464V40.40632054176071H10320.912912912912V61.39954853273135H10362.362362362363V10.835214446952527H10403.811811811811V10.835214446952527H10445.261261261261V35.66591422121893H10486.710710710711V35.66591422121893H10528.16016016016V64.334085778781H10569.60960960961V48.87133182844242H10611.059059059058V48.87133182844242H10652.508508508508V38.03611738148982H10693.957957957959V38.03611738148982H10735.407407407407V46.27539503385998H10776.856856856857V36.343115124153485H10818.306306306305V36.343115124153485H10859.755755755754V41.08352144469519H10901.205205205206V41.08352144469519H10942.654654654654V74.04063205417602H10984.104104104104V21.21896162528212H11025.553553553553V21.21896162528212H11067.003003003001V35.32731376975164H11108.452452452453V35.32731376975164H11149.901901901902V62.97968397291195H11191.351351351352V45.598194130925506H11232.8008008008V45.598194130925506H11274.250250250248V47.06546275395028H11315.6996996997V47.06546275395028H11357.149149149149V57.11060948081259H11398.598598598599V23.58916478555301H11440.048048048047V23.58916478555301H11481.4974974975V35.77878103837466H11522.946946946948V35.77878103837466H11564.396396396396V66.93002257336343H11605.845845845846V27.652370203160224H11647.295295295295V27.652370203160224H11688.744744744745V13.544018058690698H11730.194194194195V13.544018058690698H11771.643643643643V68.05869074492092H11813.093093093094V43.34085778781035H11854.542542542542V43.34085778781035H11895.991991991992V39.841986455981875H11937.44144144144V39.841986455981875H11978.89089089089V68.28442437923248H12020.34034034034V38.48758465011283H12061.78978978979V38.48758465011283H12103.23923923924V38.826185101580116H12144.688688688688V38.826185101580116H12186.138138138136V57.90067720090289H12227.587587587588V4.514672686230233H12269.037037037036V4.514672686230233H12310.486486486487V24.153498871331756H12351.935935935935V24.153498871331756H12393.385385385383V60.496613995485326H12434.834834834835V40.97065462753945H12476.284284284284V40.97065462753945H12517.733733733734V47.17832957110609H12559.183183183182V47.17832957110609H12600.632632632634V60.04514672686223H12642.082082082083V25.73363431151235H12683.531531531531V25.73363431151235H12724.980980980981V35.32731376975164H12766.43043043043V35.32731376975164H12807.879879879882V59.25507900677201H12849.32932932933V27.878103837471773H12890.778778778778V27.878103837471773H12932.228228228229V39.954853273137694H12973.677677677677V39.954853273137694H13015.127127127129V68.28442437923248H13056.576576576577V30.586907449209864H13098.026026026026V30.586907449209864H13139.475475475476V28.44243792325052H13180.924924924924V28.44243792325052H13222.374374374374V65.46275395033858H13263.823823823825V38.826185101580116H13305.273273273273V38.826185101580116H13346.722722722723V50.112866817155734H13388.172172172171V50.112866817155734H13429.621621621622V50.67720090293448H13471.07107107107V47.40406320541756H13512.52052052052V47.40406320541756H13553.96996996997V46.83972911963881H13595.419419419419V46.83972911963881H13636.868868868869V61.286681715575625H13678.318318318317V18.848758465011226H13719.767767767766V18.848758465011226H13761.217217217218V56.207674943566566H13802.666666666666V54.17607223476295H13844.116116116116V54.17607223476295H13885.565565565565V41.64785553047402H13927.015015015013V41.64785553047402H13968.464464464465V31.94130925507899H14009.913913913913V31.94130925507899H14051.363363363364V45.146726862302486H14092.812812812812V27.76523702031596H14134.262262262264V27.76523702031596H14175.711711711712V43.67945823927763H14217.16116116116V43.67945823927763H14258.61061061061V81.6027088036117H14300.06006006006V34.085778781038336H14341.509509509511V34.085778781038336H14382.95895895896V48.3069977426636H14424.408408408408V48.3069977426636H14465.857857857858V51.46726862302478H14507.307307307306V21.21896162528212H14548.756756756757V21.21896162528212H14590.206206206207V54.17607223476295H14631.655655655655V54.17607223476295H14673.105105105105V68.39729119638821H14714.554554554554V17.607223476297914H14756.004004004004V17.607223476297914H14797.453453453454V37.810383747178264H14838.902902902902V37.810383747178264H14880.352352352353V44.920993227990934H14921.801801801801V21.783295711060944H14963.251251251251V21.783295711060944H15004.7007007007V42.212189616252765H15046.15015015015V42.212189616252765H15087.5995995996V63.20541760722342H15129.049049049048V35.55304740406319H15170.498498498499V35.55304740406319H15211.947947947947V37.24604966139952H15253.397397397399V37.24604966139952H15294.846846846847V41.42212189616247H15336.296296296296V35.10158013544017H15377.745745745746V35.10158013544017H15419.195195195194V35.55304740406319H15460.644644644646V35.55304740406319H15502.094094094095V72.46049661399543H15543.543543543543V36.90744920993224H15584.992992992993V36.90744920993224H15626.442442442441V56.32054176072229H15667.891891891893V52.59593679458236H15709.341341341342V52.59593679458236H15750.79079079079V33.74717832957105H15792.24024024024V33.74717832957105H15833.689689689689V34.762979683972894H15875.13913913914V34.762979683972894H15916.58858858859V54.96613995485325H15958.038038038037V19.751693002257337H15999.487487487488V19.751693002257337H16040.936936936936V42.212189616252765H16082.386386386386V42.212189616252765H16123.835835835836V69.30022573363424H16165.285285285285V16.027088036117323H16206.734734734735V16.027088036117323H16248.184184184183V41.30925507900673H16289.633633633634V41.30925507900673H16331.083083083084V52.8216704288939H16372.532532532532V18.284424379232476H16413.981981981982V18.284424379232476H16455.431431431432V26.749435665914195H16496.880880880883V26.749435665914195H16538.33033033033V78.10383747178324H16579.77977977978V45.033860045146675H16621.22922922923V45.033860045146675H16662.678678678676V59.70654627539503H16704.12812812813V59.70654627539503H16745.577577577576V63.31828442437923H16787.027027027027V35.10158013544017H16828.476476476477V35.10158013544017H16869.925925925923V44.35665914221219H16911.375375375377V44.35665914221219H16952.824824824824V52.59593679458236H16994.274274274274V42.212189616252765H17035.723723723724V42.212189616252765H17077.17317317317V36.56884875846495H17118.622622622624V36.56884875846495H17160.07207207207V60.15801354401805H17201.52152152152V31.03837471783296H17242.97097097097V31.03837471783296H17284.420420420418V42.7765237020316H17325.86986986987V42.7765237020316H17367.31931931932V75.73363431151236H17408.76876876877V28.668171557562072H17450.21821821822V28.668171557562072H17491.667667667665V42.43792325056431H17533.11711711712V42.43792325056431H17574.566566566566V87.02031602708797H17616.016016016016V30.699774266365676H17657.465465465466V30.699774266365676H17698.914914914913V36.794582392776505H17740.364364364363V36.794582392776505H17781.813813813813V69.86455981941307H17823.263263263263V39.27765237020313H17864.712712712713V39.27765237020313H17906.162162162163V38.826185101580116H17947.61161161161V38.826185101580116H17989.06106106106V54.401805869074416H18030.51051051051V36.794582392776505H18071.95995995996V36.794582392776505H18113.40940940941V51.015801354401766H18154.858858858857V51.015801354401766H18196.308308308307V56.99774266365685H18237.757757757758V0H18279.207207207208V0H18320.656656656658V40.744920993227986H18362.106106106105V40.744920993227986H18403.555555555555V73.70203160270874H18445.005005005005V49.435665914221175H18486.454454454455V49.435665914221175H18527.903903903905V39.164785553047395H18569.353353353352V39.164785553047395H18610.802802802802V58.46501128668172H18652.252252252252V39.841986455981875H18693.701701701702V39.841986455981875H18735.151151151153V49.88713318284418H18776.6006006006V49.88713318284418H18818.05005005005V71.21896162528212H18859.4994994995V32.73137697516929H18900.94894894895V32.73137697516929H18942.3983983984V44.13092550790064H18983.847847847846V44.13092550790064H19025.297297297297V67.49435665914218H19066.746746746747V37.92325056433408H19108.196196196197V37.92325056433408H19149.645645645647V54.7404063205417H19191.095095095094V54.7404063205417H19232.544544544544V83.1828442437923H19273.993993993994V34.53724604966135H19315.443443443444V34.53724604966135H19356.892892892894V37.69751693002254H19398.34234234234V37.69751693002254H19439.79179179179V56.433408577878104H19481.24124124124V38.713318284424375H19522.690690690688V38.713318284424375H19564.14014014014V36.23024830699767H19605.58958958959V36.23024830699767H19647.03903903904V50.7900677200903H19688.48848848849V24.040632054176022H19729.937937937935V24.040632054176022H19771.38738738739V32.95711060948076H19812.836836836836V32.95711060948076H19854.286286286286V67.72009029345374H19895.735735735736V45.9367945823927H19937.185185185182V45.9367945823927H19978.634634634636V28.668171557562072H20020.084084084083V28.668171557562072H20061.533533533533V65.01128668171556H20102.982982982983V37.133182844243784H20144.43243243243V37.133182844243784H20185.881881881884V47.5169300225733H20227.33133133133V47.5169300225733H20268.78078078078V60.15801354401805H20310.23023023023V26.29796839729118H20351.679679679677V26.29796839729118H20393.12912912913V38.03611738148982H20434.578578578577V38.03611738148982H20476.028028028028V54.06320541760722H20517.477477477478V25.620767494356617H20558.926926926928V25.620767494356617H20600.376376376378V66.47855530474034H20641.825825825825V66.47855530474034H20683.275275275275V78.10383747178324";

        for (j = 1; j < howManyBinLevels; j++){ // for each level of binning
//          if (j == 1)
//          {
//            binData[binData['keys'][ key ]].d0[j] = d0bigdata;
//          }else{
//            binData[binData['keys'][ key ]].d0[j] = interpolateStraight(d0bigdata);
//          }
          binData[binData['keys'][ key ]].d0[j] = d3.svg.line()
            .x(function (d, i) { return xScale(i * Math.pow(2, j)); })
            .y(function (d, i) { return yScale(binData[binData.keys[key]].data[j][i]); })
            .interpolate(interpolationMethod)(binData[binData.keys[key]].data[j]); // 
        }
      }


      chart = d3.select(this); //Since we're using a .call(), "this" is the svg element.

      //Set it's container's dimensions
      selection
        .attr("height", height + margins.bottom)
        .attr("width", width);

      //Set the chart's dimensions
      chart
        .attr("width", width - 10) //TODO: magic numbers to get rid of scroll bars
        .attr("height", height + margins.bottom);

      //Allow dragging and zooming.
      chart.call(d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([0.125, 8]).on("zoom", my.zoom));
      //selection.call(d3.behavior.zoom().x(xAxisScale));


      //Draw the background for the chart
      if (!bkgrect) { bkgrect = chart.insert("svg:rect"); }
      bkgrect
        //.transition().duration(500)
        .attr("width", realWidth)
        .attr("height", height)
        .attr("class", "bkgrect")
        .attr("transform", "translate(" + margins.left + ", 0)")
        .style("fill", "#FFF");

      //Make the clipPath (for cropping the paths)
      if (!defclip) { defclip = chart.insert("defs").append("clipPath").attr("id", "clip").append("rect"); }
      defclip
        //.transition().duration(500)
        .attr("width", realWidth)
        .attr("transform", "translate(" + margins.left + ", 0)")
        .attr("height", height);

      //Apply the clipPath
      paths = !paths ? chart.append("g") : paths;
      paths
        .attr("clip-path", "url(#clip)")
        .attr("class", "paths")
        .attr("height", height);

      var currentSelection;


      // The following function returns something which looks like this:
      // [
      //   {type: 'rawData',     which: 0}, <-- this one is for the raw data
      //   {type: 'averages', which: 2},
      //   {type: 'mins',     which: 2},
      //   {type: 'maxes',    which: 2},
      // ]
      // add to it if you want more lines displayed
      var makeDataObjectForKeyFanciness = function () {
        var resultArray = new Array();

        if (whichLinesToRender.indexOf('rawData') > -1){
          resultArray.push({
            type: 'rawData',
            which: 0,
            whichold: 0
          });
        }

        var j = 0;
        for (var key in binData['keys']){ // for each of 'average', 'max', 'min'
          if (whichLinesToRender.indexOf(binData.keys[key]) > -1){
            for (j = 0; j < howManyBinLevels; j++) {
              if (whichLevelsToRender.indexOf(j) > -1){
                resultArray.push({
                  type: binData.keys[key],
                  whichold: binData.keys[key].which,
                  which: j
                });
              }
            }
          }
        }

        return resultArray;
      };

      //Make and render the Positive curves.
      currentSelection = paths.selectAll(".posPath")
        .data(makeDataObjectForKeyFanciness(), function (d) {return d.type; });

      //update
      currentSelection
        //.attr("d", function (d, i) { return interpolateStraight(currentSelection[0][i].getAttribute('d')); })
        //.attr("d", function (d, i) { interpolateLength(currentSelection[0][i].getAttribute('d'), binData[d.type].d0[d.which]); return interpolateStraight(currentSelection[0][i].getAttribute('d')); })
        .attr("d", function (d, i) { return interpolateLength(currentSelection[0][i].getAttribute('d'), binData[d.type].d0[d.which])[0]; })
        .transition().duration(500)
        .attr("opacity", 1)
        .attr("fill", function (d, i) { return "rgba(0,0,0,0)"; })
        .style("stroke-width", function () { return outlinesOrNot ? 1 : 0; })
        .style("stroke", function (d, i) { return binData[d.type].colour; })
        .attr("d", function (d, i) { return interpolateLength(currentSelection[0][i].getAttribute('d'), binData[d.type].d0[d.which])[1];  })
        .transition().duration(500)
        .attr("transform", function (d, i) { return "translate(" + margins.left + ", 0)"; });

      //enter
      currentSelection.enter().append("path")
        .attr("class", "posPath")
        .attr("fill", function (d, i) {return "rgba(0,0,0,0)"; })
        .style("stroke-width", function () { return outlinesOrNot ? 1 : 0; })
        .attr("d", function (d, i) { return binData[d.type].d0[d.which]; })
        .attr("transform", function (d, i) {return "translate(" + margins.left + ", 0)"; })
        .style("stroke", function (d, i) { return binData[d.type].colour; })
        .attr("opacity", 0)
        .transition().ease("cubic-out").duration(500)
        .attr("opacity", 1);

      //exit
      currentSelection.exit()
        .attr("fill", function (d, i) { return "rgba(0,0,0,0)"; })
        .transition().ease("cubic-out").duration(500)
        .attr("opacity", 0)
        .remove();

      // Draw Axes
      xAxis = d3.svg.axis()
        .scale(xAxisScale).orient("bottom");
      //yAxis = d3.svg.axis().scale(yScale).orient("bottom");

      if (!xAxisContainer) { xAxisContainer = chart.append("svg:g"); }
      xAxisContainer.attr("class", "x axis")
        .attr("transform", "translate(" + margins.left + "," + height + ")");
      xAxisContainer.transition().duration(500).call(xAxis);

      //Draw the outline for the chart
      if (!frgrect) { frgrect = chart.append("svg:rect"); }
      frgrect
        .attr("width", realWidth)
        .attr("height", height)
        .attr("class", "frgrect")
        .style("fill", "rgba(0,0,0,0)")
        .style("stroke-width", 3)
        .attr("transform", "translate(" + margins.left + ", 0)")
        .style("stroke", "#000");

    });
  }


  // == Getters and Setters ==

  my.width = function (value) {
    if (!arguments.length) return width;
    width = value;
    return my;
  }

  my.height = function (value) {
    if (!arguments.length) return height;
    height = value;
    return my;
  }

  my.howManyBinLevels = function (value) {
    if (!arguments.length) return howManyBinLevels ;
    howManyBinLevels = value;
    return my;
  }

  my.whichLevelsToRender = function (value) {
    if (!arguments.length) return whichLevelsToRender  ;
    whichLevelsToRender = value;
    return my;
  }

  my.whichLinesToRender  = function (value) {
    if (!arguments.length) return whichLinesToRender   ;
    whichLinesToRender   = value;
    return my;
  }

  my.outlinesOrNot = function (value) {
    if (!arguments.length) return outlinesOrNot;
    outlinesOrNot = value;
    return my;
  }

  my.zoomout = function () {
    xScale.domain([0, xScale.domain()[1] * 2]); // TODO: modify a constant instead? That way we can re-do each domain each time without worrying or hacking around.
    xAxisScale.domain([0, xAxisScale.domain()[1] * 2]);
    return my;
  }

  my.zoomin = function () {
    xScale.domain([0, xScale.domain()[1] / 2]);
    xAxisScale.domain([0, xAxisScale.domain()[1] / 2]);
    return my;
  }

  my.zoom = function () {
    xAxisScale.domain(xScale.domain());
    xAxisContainer.call(xAxis);
    my.update();
  }

  my.update = function () {
    my(slctn);
  }

  my.setSelectedLines = function () {
    var a = [].map.call (document.querySelectorAll ("#render-lines input:checked"), function (checkbox) { return checkbox.value;} );
    whichLinesToRender = a;

    var b = [Number(document.querySelector("#render-depth input:checked").value)];
    whichLevelsToRender = b;

    var b = document.querySelector("#render-method input:checked").value;
    interpolationMethod = b;
    return my;
  }

  return my;
}
