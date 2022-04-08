
source $polyplyenv
 
ITPOUT="polymere.itp"
GROOUT="out.gro"

cat $itp > polymere.itp
echo $top > syst.top

polyply gen_coords -p syst.top -o $GROOUT -name $name"monjolipolymer" -dens $density > polyply2.out 2> polyply2.err

[ -f $GROOUT ] && cat $GROOUT
