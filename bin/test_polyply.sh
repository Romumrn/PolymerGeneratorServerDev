
source $polyplyenv

cp input/json.inp monjson.json
ITPOUT="polymere.itp"
GROOUT="out.gro"
NAME="monjolipolymer"
polyply gen_params -lib $ff -o $ITPOUT -seqf monjson.json -name $NAME > polyply.out 2> polyply.err


printf "#include \"$martiniForceField\" \n#include \"$ITPOUT\" \n[ system ]\n; name\nMyLovelySystem 1\n[ molecules ]\n; name  number\n$NAME 1"  > syst.top 

polyply gen_coords -p syst.top -o $GROOUT -name "monjolipolymer" -dens 1000 > polyply2.out 2> polyply2.err
[ -f $ITPOUT ] && cat $ITPOUT 
echo "STOP"
[ -f $GROOUT ] && cat $GROOUT 
