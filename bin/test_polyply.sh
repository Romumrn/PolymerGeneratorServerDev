echo "Polyply"
source $polyplyenv
cp input/json.inp monjson.json
PPOUT="polymerde.itp"
polyply gen_params -lib $ff -o $PPOUT -seqf monjson.json -name "monjolipolymer" > polyply.out 2> polyply.err
#[ -f $PPOUT ] && cat $PPOUT 

polyply gen_coords -p $PPOUT -o xfbwkvgterhk.gro -name "monjolipolymer" -dens 1100

#echo "{\"polyRes\":$OUT, \"polyLog\":$MAYBE_ERR}"